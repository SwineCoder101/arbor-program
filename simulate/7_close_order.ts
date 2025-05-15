import { initClient, logBalances } from "./util";

async function main() {
  const { client, trader } = await initClient();
  
  console.log("Closing order...");
  await client.closeOrder({
    seed: 1,
    signer: trader
  });
  
  console.log("Order closed!");
  await logBalances(client, trader.publicKey);
}

main().catch(console.error);