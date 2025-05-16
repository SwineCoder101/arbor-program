import { ArborClient } from "../sdk/arbor-client";
import { initClient, logBalances, transferYieldFromReserveToVault } from "./util";

async function main() {
  const { client, trader, usdcReserve } = await initClient();
  
  await client.setGlobalConfig();
  
  const seed = 5;
  
  const [orderAddress] = await ArborClient.findOrderAddress(trader.publicKey,seed);

  const [jupiterVaultAddress] = await ArborClient.findVaultAddress(orderAddress, "jup");
  const [driftVaultAddress] = await ArborClient.findVaultAddress(orderAddress, "drift");

  await transferYieldFromReserveToVault(usdcReserve, driftVaultAddress,  2_000_000)
  await transferYieldFromReserveToVault(usdcReserve, jupiterVaultAddress,  2_000_000)

  await logBalances(client, trader.publicKey);
}

main().catch(console.error);