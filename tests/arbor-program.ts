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
            admin.publicKey,
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

  it("creates protocol vaults successfully", async () => {
    const {orderAddress, jupiterVault, driftVault} = await client.initializeProtocolVaults(trader.wallet, 111);

    const jupiterVaultInfo = await provider.connection.getAccountInfo(jupiterVault);
    const driftVaultInfo = await provider.connection.getAccountInfo(driftVault);

    expect(jupiterVaultInfo).to.exist;
    expect(driftVaultInfo).to.exist;
    expect(orderAddress.toBase58()).to.exist;
  });

  it("creates order successfully with 50% drift and 50% jupiter perp", async () => {
    const tx = await createTestOrder(1);
    console.log("Your transaction signature", tx);
    
    const order = await client.getOrder(1, trader.wallet);
    expect(order.ratioBps.toNumber()).to.equal(5000);
    expect(order.isOpen).to.be.true;
  });

  it("creates order and then closes it successfully with fee transfer to treasury", async () => {

    const balancesBeforeOrder = await logBalancesUserTreasury(provider, client, trader.wallet.publicKey, "Before creating order", treasuryVault, false);

    const orderAddress = await createTestOrder(3);
    const openOrder = await client.getOpenOrderByAddress(orderAddress);

    //check protocol vault balances
    const balancesAfterOrder =  await logBalancesAfterOrderOpen(provider, client, openOrder, trader.wallet.publicKey, treasuryVault, "Before closing order", false);

    await client.closeOrder({
      seed: 3,
      signer: trader.wallet
    });
    const balancesAfterOrderClose =  await logBalancesUserTreasury(provider, client, trader.wallet.publicKey, "After closing order", treasuryVault, false);


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

    const balancesAfterOrder =  await logBalancesAfterOrderOpen(provider, client, openOrder, trader.wallet.publicKey, treasuryVault, "Before closing order", false);

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


    // TODO check the amounts are getting topped up correctly before and after
    const topUpTx = await client.topUpOrder({
      seed: 7,
      driftAmount: 500_000_000,
      jupiterAmount: 500_000_000,
      treasuryVault,
      signer: trader.wallet,
      order: orderAddress
    });

    const order = await client.getOrder(7, trader.wallet);
    expect(order.driftPerpAmount.toNumber()).to.be.greaterThan(1000000000);
  });

  it("creates order, generates yield and then claims yield successfully", async () => {
    const orderAddress = await createTestOrder(6);

    console.log("Expected order PDA:", orderAddress.toBase58());
    const derivedFromSeed = ArborClient.findOrderAddress(trader.wallet.publicKey, 6)[0];
    console.log("Derived from seed directly:", derivedFromSeed.toBase58());

    await client.claimYield({
      seed: 6,
      driftYield: 1_000_000,
      jupiterYield: 1_000_000,
      signer: trader.wallet
    });

    let order = await client.getOrder(6, trader.wallet);
    console.log('claimed order: ', order );

    await client.claimYield({
      seed: 6,
      driftYield: 2_000_000,
      jupiterYield: 2_000_000,
      signer: trader.wallet
    });

    order = await client.getOrder(6, trader.wallet);
  });

  it("creates order and throws unauthorized error when claiming yield with wrong authority", async () => {
    await createTestOrder(8);
    try {
      await client.claimYield({
        seed: 8,
        driftYield: 1_000_000,
        jupiterYield: 1_000_000,
        signer: usdcReserve.wallet})
      }catch(error) {
        expect(error.message).to.exist;
      }
  });

  it("creates order and throws unauthorized error when top up with wrong authority", async () => {
    const orderAddress = await createTestOrder(9);
    try {
      await client.topUpOrder({
        seed: 9,
        driftAmount: 1_000_000,
        jupiterAmount: 1_000_000,
        treasuryVault,
        signer: usdcReserve.wallet,
        order: orderAddress
      });
      expect.fail("Should have thrown unauthorized error");
    } catch (error) {
      expect(error.message).to.exist;
    }
  });

  it("Transfers yield to protocol vaults successfully", async () => {
    const orderAddress = await createTestOrder(11);

    await client.transferYieldToProtocolVaults({
      seed: 11,
      signer: trader.wallet,
      jupiterAmount: 1_000_000,
      driftAmount: 1_000_000
    });

    const openOrder = await client.getOpenOrderByAddress(orderAddress);

    const balancesAfterTransfer = await logBalancesAfterOrderOpen(provider, client, openOrder, trader.wallet.publicKey, treasuryVault, "After transferring yield", false);

    expect(balancesAfterTransfer.usdcBalanceDrift.uiAmount).to.equal(1001);
    expect(balancesAfterTransfer.usdcBalanceJupiter.uiAmount).to.equal(1001);

  });

  it("withdraws fees from treasury successfully", async () => {
    await createTestOrder(10);
    await client.withdrawFromTreasury(1_000_000,admin);

    const balancesAfterWithdraw = await logBalancesUserTreasury(provider, client, admin.publicKey, "After withdrawing from treasury", treasuryVault, false);

    expect(balancesAfterWithdraw.usdcBalanceTreasury.uiAmount).to.equal(19);
  });

  it("creates order, keeper withdraws successfully to replicate impermanent loss", async () => {
    const orderAddress = await createTestOrder(12);

    const balancesBeforeWithdraw = await logBalancesUserTreasury(provider, client, trader.wallet.publicKey, "Before withdrawing from treasury", treasuryVault, false);

    await client.keeperWithdraw(1_000_000, 1_000_000, orderAddress, admin);

    const balancesAfterWithdraw = await logBalancesUserTreasury(provider, client, trader.wallet.publicKey, "After withdrawing from treasury", treasuryVault, false);

    const treasuryDiff = balancesAfterWithdraw.usdcBalanceTreasury.uiAmount - balancesBeforeWithdraw.usdcBalanceTreasury.uiAmount;

    expect(treasuryDiff).to.be.equal(2);

  });

});



