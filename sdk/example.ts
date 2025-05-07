import * as anchor from "@coral-xyz/anchor";
import { ArborClient } from "./arbor-client";

async function main() {
  anchor.setProvider(anchor.AnchorProvider.env());

  const client = new ArborClient(anchor.getProvider() as anchor.AnchorProvider);

  const seed = 12345;
  const jupPerpAmount = 1000000; // 1 USDC (6 decimals)
  const driftPerpAmount = 1000000; // 1 USDC (6 decimals)
  const ratioBps = 5000; // 50%
  const driftPerpIdx = 0;
  const jupPerpIdx = 0;
  const driftSide = 0; // 0 for long, 1 for short
  const jupSide = 1; // 0 for long, 1 for short

  try {
    // Create the order
    const tx = await client.createOrder(
      seed,
      jupPerpAmount,
      driftPerpAmount,
      ratioBps,
      driftPerpIdx,
      jupPerpIdx,
      driftSide,
      jupSide
    );
    console.log("Order created! Transaction signature:", tx);

    // Get the order details
    const order = await client.getOrder(seed);
    console.log("Order details:", order);

    // Get global config
    const globalConfig = await client.getGlobalConfig();
    console.log("Global config:", globalConfig);

  } catch (error) {
    console.error("Error:", error);
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
); 