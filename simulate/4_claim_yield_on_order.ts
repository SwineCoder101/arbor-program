import { initClient, logBalances } from "./util";

async function main() {
  const { client, trader } = await initClient();
  
  console.log("Claiming yield...");
  await client.claimYield({
    seed: 1,
    driftYield: 500_000, // 0.5 USDC
    jupiterYield: 500_000, // 0.5 USDC
    signer: trader
  });
  
  console.log("Yield claimed!");
  await logBalances(client, trader.publicKey);
}

main().catch(console.error);