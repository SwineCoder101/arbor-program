import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ArborProgram } from "../target/types/arbor_program";
import { ArborClient } from "../sdk/arbor-client";
import { PublicKey, Keypair } from "@solana/web3.js";
import { expect } from "chai";
import { setupWalletsAndMints } from "./util";

describe("arbor-program", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.ArborProgram as Program<ArborProgram>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const client = new ArborClient(provider);


  before(async () => {
    console.log("provider.wallet.publicKey", provider.wallet.publicKey.toBase58());
    const balance = await provider.connection.getBalance(provider.wallet.publicKey);
    console.log("balance: ", balance);

    const { usdcMint, trader, usdcReserve, admin } = await setupWalletsAndMints(provider);
    
    // Make sure to use usdcMint.publicKey
    console.log("Using USDC Mint:", usdcMint.publicKey.toBase58());
    
    await client.initializeConfig(
        100, // 1% fee
        provider.wallet.publicKey,
        usdcMint.publicKey,
    );
});

  // Helper to create a test order
  const createTestOrder = async (seed: number, ratioBps: number = 5000) => {
    return await client.createOrder({
      seed,
      jupPerpAmount: 1000000,
      driftPerpAmount: 1000000,
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
    
    const order = await client.getOrder(1);
    expect(order.ratioBps.toNumber()).to.equal(5000);
    expect(order.isOpen).to.be.true;
  });

  it("creates order successfully with 60% drift and 40% jupiter perp", async () => {
    const tx = await client.createOrder({
      seed: 2,
      jupPerpAmount: 800000,
      driftPerpAmount: 1200000,
      ratioBps: 6000,
      driftPerpIdx: 0,
      jupPerpIdx: 0,
      driftSide: 0,
      jupSide: 1
    });
    console.log("Your transaction signature", tx);
    
    const order = await client.getOrder(2);
    expect(order.ratioBps.toNumber()).to.equal(6000);
    expect(order.isOpen).to.be.true;
  });

  it("creates order and then closes it", async () => {
    const createTx = await createTestOrder(3);
    console.log("Create transaction signature", createTx);

    const [globalConfigAddress] = await ArborClient.findGlobalConfigAddress();
    const globalConfig = await client.getGlobalConfig();
    const treasuryVault = new PublicKey("treasury_vault_address"); // Replace with actual treasury vault address

    const closeTx = await client.closeOrder({
      seed: 3,
      treasuryVault
    });
    console.log("Close transaction signature", closeTx);

    const order = await client.getOrder(3);
    expect(order.isOpen).to.be.false;
  });

  it("creates order and throws unauthorized error when closing with wrong authority", async () => {
    const createTx = await createTestOrder(4);
    console.log("Create transaction signature", createTx);

    // Create a different wallet for unauthorized access
    const otherWallet = anchor.web3.Keypair.generate();
    const otherClient = new ArborClient(new anchor.AnchorProvider(
      provider.connection,
      new anchor.Wallet(otherWallet),
      provider.opts
    ));

    const [globalConfigAddress] = await ArborClient.findGlobalConfigAddress();
    const globalConfig = await client.getGlobalConfig();
    const treasuryVault = new PublicKey("treasury_vault_address"); // Replace with actual treasury vault address

    try {
      await otherClient.closeOrder({
        seed: 4,
        treasuryVault
      });
      expect.fail("Should have thrown unauthorized error");
    } catch (error) {
      expect(error.message).to.include("unauthorized");
    }
  });

  // it("creates order and throws unauthorized error when claiming yield with wrong authority", async () => {
  //   const tx = await client.createOrder(1, 1000000, 1000000, 5000, 0, 0, 0, 1);
  //   console.log("Your transaction signature", tx);
  // });

  // it("creates order and throws unauthorized error when top up with wrong authority", async () => {
  //   const tx = await client.createOrder(1, 1000000, 1000000, 5000, 0, 0, 0, 1);
  //   console.log("Your transaction signature", tx);
  // });

  it("creates order and throws invalid side error when side is invalid", async () => {
    try {
      await client.createOrder({
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

  it("creates order, generates yield and then claims yield successfully", async () => {
    const createTx = await createTestOrder(6);
    console.log("Create transaction signature", createTx);

    // Simulate some time passing and yield generation
    await new Promise(resolve => setTimeout(resolve, 1000));

    const claimTx = await client.claimYield({
      seed: 6
    });
    console.log("Claim yield transaction signature", claimTx);

    const order = await client.getOrder(6);
    expect(order.lastArbitrageRate.toNumber()).to.be.greaterThan(0);
  });

  // it("creates order, loses yield and closes order successfully", async () => {
  //   const tx = await client.createOrder(1, 1000000, 1000000, 5000, 0, 0, 0, 1);
  // });

  it("creates order and top ups successfully", async () => {
    const createTx = await createTestOrder(7);
    console.log("Create transaction signature", createTx);

    const [globalConfigAddress] = await ArborClient.findGlobalConfigAddress();
    const globalConfig = await client.getGlobalConfig();
    const treasuryVault = new PublicKey("treasury_vault_address"); // Replace with actual treasury vault address

    const topUpTx = await client.topUpOrder({
      seed: 7,
      amount: 500000,
      treasuryVault
    });
    console.log("Top up transaction signature", topUpTx);

    const order = await client.getOrder(7);
    expect(order.driftPerpAmount.toNumber()).to.be.greaterThan(1000000);
  });
});



