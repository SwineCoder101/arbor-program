import { initClient, logBalances } from "./util";

async function main() {
  const { client, trader } = await initClient();
  await client.setGlobalConfig();
  
  console.log("Claiming yield...");
  await client.claimYield({
    seed: 3,
    driftYield: 1000_000, // 0.5 USDC
    jupiterYield: 1000_000, // 0.5 USDC
    signer: trader
  });

  // wait
  await new Promise((resolve) => setTimeout(resolve, 5000));
  
  console.log("Yield claimed!");
  await logBalances(client, trader.publicKey);
}

main().catch(console.error);