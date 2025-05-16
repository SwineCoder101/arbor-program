import { ArborClient } from "../sdk/arbor-client";
import { initClient, logBalances } from "./util";
import * as fs from 'fs';
import * as path from 'path';
import PublicKey from "@solana/web3.js";

async function main() {
  const { client, trader } = await initClient();

  client.setGlobalConfig();

  const accountInfoPath = path.join(__dirname, 'account_info.json');
  const accountInfo = JSON.parse(fs.readFileSync(accountInfoPath, 'utf8'));
  const [orderAddress] = await ArborClient.findOrderAddress(trader.publicKey, 3);
  const treasuryVault = await client.getTreasuryVaultAddress(accountInfo?.usdcMint);

  console.log("treasury vault: ", treasuryVault);
  
  console.log("Topping up order...");
  await client.topUpOrder({
    seed: 3,
    driftAmount: 1000_000,
    jupiterAmount: 1000_000,
    treasuryVault,
    signer: trader,
    order: orderAddress
  });
  
  console.log("Order topped up!");
  await logBalances(client, trader.publicKey);
}

main().catch(console.error);