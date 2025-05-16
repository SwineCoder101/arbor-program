import { ArborClient } from "../sdk/arbor-client";
import { initClient, logBalances } from "./util";

async function main() {
  const { client, admin, trader } = await initClient();

  await client.setGlobalConfig();

  const [orderAddress] = await ArborClient.findOrderAddress(trader.publicKey, 3);;
  
  console.log("Simulating impermanent loss...");
  await client.keeperWithdraw(
    3_000_000, // 3 USDC from drift
    7_000_000, // 7 USDC from jupiter
    orderAddress,
    admin
  );
  
  console.log("Impermanent loss simulated!");
  await logBalances(client, trader.publicKey);
}

main().catch(console.error);