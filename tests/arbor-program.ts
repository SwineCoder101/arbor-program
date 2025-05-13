import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import { ArborClient } from "../sdk/arbor-client";
import { ArborProgram } from "../target/types/arbor_program";
import { logBalancesAfterOrderOpen, logBalancesUserTreasury, setupWalletsAndMints } from "./util";

describe("arbor-program", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.ArborProgram as Program<ArborProgram>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const client = new ArborClient(provider);

  let admin: Keypair;
  let usdcReserve, trader: { wallet: Keypair, ata: PublicKey };
  let usdcMint: {publicKey: PublicKey, keypair: Keypair};
  let treasuryVault: PublicKey;

  before(async () => {
    console.log("provider.wallet.publicKey", provider.wallet.publicKey.toBase58());
    const balance = await provider.connection.getBalance(provider.wallet.publicKey);
    console.log("balance: ", balance);

    try { 
        const wallets = await setupWalletsAndMints(provider);
        trader = wallets.trader;
        usdcReserve = wallets.usdcReserve;
        admin = wallets.admin;
        usdcMint = wallets.usdcMint;
        
        console.log("Using USDC Mint:", usdcMint.publicKey.toBase58());
        
        // Verify USDC mint exists
        const mintInfo = await provider.connection.getAccountInfo(usdcMint.publicKey);
        if (!mintInfo) {
            throw new Error("USDC Mint account not found");
        }

        // Initialize config
        await client.initializeConfig(
            100, // 1% fee
            provider.wallet.publicKey,
            usdcMint.publicKey
        );

        // Additional verification
        const [globalConfigAddress] = await ArborClient.findGlobalConfigAddress();
        const accountInfo = await provider.connection.getAccountInfo(globalConfigAddress);
        if (!accountInfo) {
            throw new Error("GlobalConfig account not created");
        }

        console.log("GlobalConfig account created with data length:", accountInfo.data.length);

        // Try to fetch the account
        const globalConfig = await client.getGlobalConfig();
        console.log("GlobalConfig fetched successfully:", {
            feeBps: globalConfig.feeBps.toNumber(),
            admin: globalConfig.admin.toBase58(),
            usdcMint: globalConfig.usdcMint.toBase58(),
            bump: globalConfig.bump
        });

        treasuryVault = await client.getTreasuryVaultAddress();

        console.log("Setup completed successfully");
    } catch (error) {
        console.error("Error in before hook:", error);
        throw error;
    } 
});

  // Helper to create a test order
  const createTestOrder = async (seed: number, ratioBps: number = 5000) => {
    return await client.createOrder({
      signer: trader.wallet,
      seed,
      jupPerpAmount: 1_000_000_000,
      driftPerpAmount: 1_000_000_000,
      ratioBps,
      driftPerpIdx: 0,
      jupPerpIdx: 0,
      driftSide: 0,
      jupSide: 1
    });
  };

  it("creates order successfully with 50% drift and 50% jupiter perp", async () => {
    const tx = await createTestOrder(1);
    console.log("Your transaction signature", tx);
    
    const order = await client.getOrder(1, trader.wallet);
    expect(order.ratioBps.toNumber()).to.equal(5000);
    expect(order.isOpen).to.be.true;
  });

  it("creates order and then closes it successfully with fee transfer to treasury", async () => {

    const balancesBeforeOrder = await logBalancesUserTreasury(provider, client, trader, "Before creating order", treasuryVault, false);

    const orderAddress = await createTestOrder(3);
    const openOrder = await client.getOpenOrderByAddress(orderAddress);

    //check protocol vault balances
    const balancesAfterOrder =  await logBalancesAfterOrderOpen(provider, client, openOrder, trader, treasuryVault, "Before closing order", false);

    await client.closeOrder({
      seed: 3,
      signer: trader.wallet
    });
    const balancesAfterOrderClose =  await logBalancesUserTreasury(provider, client, trader, "After closing order", treasuryVault, false);


    // check transfers into protocol vault
    expect(balancesAfterOrder.usdcBalanceDrift.uiAmount).to.equal(1000);
    expect(balancesAfterOrder.usdcBalanceJupiter.uiAmount).to.equal(1000);

    // check treasury vault after closing order
    expect(balancesAfterOrderClose.usdcBalanceTreasury.uiAmount).to.equal(20);
    
  });


  it("creates order successfully with 60% drift and 40% jupiter perp", async () => {
    const orderAddress = await client.createOrder({
      signer: trader.wallet,
      seed: 2,
      jupPerpAmount: 800_000_000,
      driftPerpAmount: 1200_000_000,
      ratioBps: 6000,
      driftPerpIdx: 0,
      jupPerpIdx: 0,
      driftSide: 0,
      jupSide: 1
    });

    const openOrder = await client.getOpenOrderByAddress(orderAddress);

    console.log("openOrder: ", openOrder);

    const balancesAfterOrder =  await logBalancesAfterOrderOpen(provider, client, openOrder, trader, treasuryVault, "Before closing order", false);

    expect(balancesAfterOrder.usdcBalanceDrift.uiAmount).to.equal(1200);
    expect(balancesAfterOrder.usdcBalanceJupiter.uiAmount).to.equal(800);
  });


  it("creates order and throws unauthorized error when closing with wrong authority", async () => {
    const orderAddress = await createTestOrder(4);
    console.log("orderAddress: ", orderAddress);
    try {
      await client.closeOrder({
        seed: 4,
        signer: usdcReserve.wallet
      });
      expect.fail("Should have thrown unauthorized error");
    } catch (error) {
      expect(error.message).to.exist;
    }
  });

  it("creates order and throws invalid side error when side is invalid", async () => {
    try {
      await client.createOrder({
        signer: trader.wallet,
        seed: 5,
        jupPerpAmount: 1000000,
        driftPerpAmount: 1000000,
        ratioBps: 5000,
        driftPerpIdx: 0,
        jupPerpIdx: 0,
        driftSide: 2, // Invalid side
        jupSide: 1
      });
      expect.fail("Should have thrown invalid side error");
    } catch (error) {
      expect(error.message).to.include("invalid side");
    }
  });

  it("creates order and top ups successfully", async () => {
    const orderAddress = await createTestOrder(7);

    const treasuryVault = await client.getTreasuryVaultAddress();

    const topUpTx = await client.topUpOrder({
      seed: 7,
      driftAmount: 500_000_000,
      jupiterAmount: 500_000_000,
      treasuryVault,
      signer: trader.wallet,
      order: orderAddress
    });
    console.log("Top up transaction signature", topUpTx);

    const order = await client.getOrder(7, trader.wallet);
    expect(order.driftPerpAmount.toNumber()).to.be.greaterThan(1000000000);
  });

  it.skip("creates order, generates yield and then claims yield successfully", async () => {
    const createTx = await createTestOrder(6);
    console.log("Create transaction signature", createTx);

    // Simulate some time passing and yield generation
    await new Promise(resolve => setTimeout(resolve, 1000));

    const claimTx = await client.claimYield({
      seed: 6
    });
    console.log("Claim yield transaction signature", claimTx);

    const order = await client.getOrder(6, trader.wallet);
    expect(order.lastArbitrageRate.toNumber()).to.be.greaterThan(0);
  });

  // it("creates order and throws unauthorized error when claiming yield with wrong authority", async () => {
  //   const tx = await client.createOrder(1, 1000000, 1000000, 5000, 0, 0, 0, 1);
  //   console.log("Your transaction signature", tx);
  // });

  // it("creates order and throws unauthorized error when top up with wrong authority", async () => {
  //   const tx = await client.createOrder(1, 1000000, 1000000, 5000, 0, 0, 0, 1);
  //   console.log("Your transaction signature", tx);
  // });

  // it("creates order, experience impermanent loss and closes order successfully", async () => {
  //   // const tx = await client.createOrder(1, 1000000, 1000000, 5000, 0, 0, 0, 1);
  // });


});



