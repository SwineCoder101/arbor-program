import { initClient, loadKeypair } from "./util";
import { PublicKey } from "@solana/web3.js";

async function main() {
  const { client, admin } = await initClient();
  
  // Use existing USDC devnet mint or create a new test token
  const usdcMint = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"); // Devnet USDC
  
  console.log("Initializing config...");
  await client.initializeConfig(
    100, // 1% fee
    admin.publicKey,
    usdcMint
  );
  
  console.log("Environment initialized successfully!");
}

main().catch(console.error);