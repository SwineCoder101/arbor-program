import { initClient, logBalances } from "./util";

async function main() {
  const { client, trader } = await initClient();
  
  const [orderAddress] = await client.findOrderAddress(trader.publicKey, 1);
  const treasuryVault = await client.getTreasuryVaultAddress();
  
  console.log("Topping up order...");
  await client.topUpOrder({
    seed: 1,
    driftAmount: 500_000, // 0.5 USDC
    jupiterAmount: 500_000, // 0.5 USDC
    treasuryVault,
    signer: trader,
    order: orderAddress
  });
  
  console.log("Order topped up!");
  await logBalances(client, trader.publicKey);
}

main().catch(console.error);