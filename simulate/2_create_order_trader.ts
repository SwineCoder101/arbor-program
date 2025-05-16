import { PublicKey } from "@solana/web3.js";
import { initClient, logBalances } from "./util";
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const { client, trader } = await initClient();

  // Load account info to get USDC mint
  const accountInfoPath = path.join(__dirname, 'account_info.json');
  const accountInfo = JSON.parse(fs.readFileSync(accountInfoPath, 'utf8'));

  await client.setGlobalConfig();

  
  console.log("Creating order...");
  const orderAddress = await client.createOrder({
    signer: trader,
    seed: 1,
    jupPerpAmount: 1_000_000, // 1 USDC
    driftPerpAmount: 1_000_000, // 1 USDC
    ratioBps: 5000, // 50/50 split
    driftPerpIdx: 0,
    jupPerpIdx: 0,
    driftSide: 0, // long
    jupSide: 1 // short
  });
  
  console.log(`Order created: ${orderAddress}`);
  await logBalances(client, trader.publicKey);
}

main().catch(console.error);