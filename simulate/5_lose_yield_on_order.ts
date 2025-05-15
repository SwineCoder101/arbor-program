import { initClient, logBalances } from "./util";

async function main() {
  const { client, admin, trader } = await initClient();
  
  const [orderAddress] = await client.findOrderAddress(trader.publicKey, 1);
  
  console.log("Simulating impermanent loss...");
  await client.keeperWithdraw(
    300_000, // 0.3 USDC from drift
    700_000, // 0.7 USDC from jupiter
    orderAddress,
    admin
  );
  
  console.log("Impermanent loss simulated!");
  await logBalances(client, trader.publicKey);
}

main().catch(console.error);