import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import { ArborClient } from "../sdk/arbor-client";
import * as spl from "@solana/spl-token";
import path from "path";
import { Key } from "readline";

// Load keypair from file
export function loadKeypair(path: string): Keypair {
  return Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(path).toString()))
  );
}

export const CONNECTION = new Connection("https://api.devnet.solana.com");

// Initialize client with devnet connection
export async function initClient(): Promise<{
  client: ArborClient;
  admin: Keypair;
  trader: Keypair;
  usdcReserve: Keypair;
}> {
  const admin = loadKeypair("./simulate/admin-keypair.json");
  const trader = loadKeypair("./simulate/trader-keypair.json");
  const usdcReserve = loadKeypair("./simulate/usdc-reserve-keypair.json");
  
  const wallet = new anchor.Wallet(admin);
  const provider = new anchor.AnchorProvider(CONNECTION, wallet, {
    commitment: "confirmed",
  });
  
  anchor.setProvider(provider);
  const client = new ArborClient(provider);

  client.setGlobalConfig();
  
  return { client, admin, trader, usdcReserve };
}

// Log balances helper
export async function logBalances(
  client: ArborClient,
  user: PublicKey,
  vault?: PublicKey
) {
  const usdcBalance = await client.getUSDCBalanceOf(
    CONNECTION,
    user
  );
  
  console.log(`User USDC balance: ${usdcBalance.uiAmount}`);
  
  if (vault) {
    const vaultBalance = await client.getVaultBalance(
        CONNECTION,
      vault
    );
    console.log(`Vault USDC balance: ${vaultBalance.uiAmount}`);
  }
}

export async function transferYieldFromReserveToVault(
  reserve: Keypair,
  vaultAddress: PublicKey,
  amount: number
) {
  // Load account info to get USDC mint and reserve ATA
  const accountInfoPath = path.join(__dirname, 'account_info.json');
  const accountInfo = JSON.parse(fs.readFileSync(accountInfoPath, 'utf8'));
  const usdcMint = new PublicKey(accountInfo.usdcMint);
  const reserveAta = new PublicKey(accountInfo.usdcReserveAta);

  // Create provider with reserve as signer
  const wallet = new anchor.Wallet(reserve);
  const provider = new anchor.AnchorProvider(CONNECTION, wallet, {
    commitment: "confirmed",
  });

  // Transfer tokens from reserve to vault
  const tx = await spl.transfer(
    CONNECTION,
    reserve,
    reserveAta,
    vaultAddress,
    reserve,
    amount
  );

  console.log(`Transferred ${amount} tokens from reserve to vault: ${tx}`);
  return tx;
}