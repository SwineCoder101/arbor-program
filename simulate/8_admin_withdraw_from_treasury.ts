import { initClient, logBalances } from "./util";

async function main() {
  const { client, admin } = await initClient();
  
  console.log("Withdrawing from treasury...");
  await client.withdrawFromTreasury(500_000, admin); // 0.5 USDC
  
  console.log("Withdrawal complete!");
  await logBalances(client, admin.publicKey);
}

main().catch(console.error);