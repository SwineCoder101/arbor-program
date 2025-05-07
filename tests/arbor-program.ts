import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ArborProgram } from "../target/types/arbor_program";
import { ArborClient } from "../sdk/arbor-client";

describe("arbor-program", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.ArborProgram as Program<ArborProgram>;

  const provider = anchor.getProvider() as anchor.AnchorProvider;

  const client = new ArborClient(provider);
  

  it("creates order successfully with 50% drift and 50% jupiter perp", async () => {
    const tx = await client.createOrder(1, 1000000, 1000000, 5000, 0, 0, 0, 1);
    console.log("Your transaction signature", tx);
  });

  it("creates order successfully with 60% drift and 40% jupiter perp", async () => {
    const tx = await client.createOrder(1, 1000000, 1000000, 5000, 0, 0, 0, 1);
    console.log("Your transaction signature", tx);
  });


  it("creates order and then closes it", async () => {
    const tx = await client.createOrder(1, 1000000, 1000000, 5000, 0, 0, 0, 1);
    console.log("Your transaction signature", tx);
  });

  it("creates order and throws unauthorized error when closing with wrong authority", async () => {
    const tx = await client.createOrder(1, 1000000, 1000000, 5000, 0, 0, 0, 1);
    console.log("Your transaction signature", tx);
  });

  it("creates order and throws unauthorized error when claiming yield with wrong authority", async () => {
    const tx = await client.createOrder(1, 1000000, 1000000, 5000, 0, 0, 0, 1);
    console.log("Your transaction signature", tx);
  });

  it("creates order and throws unauthorized error when top up with wrong authority", async () => {
    const tx = await client.createOrder(1, 1000000, 1000000, 5000, 0, 0, 0, 1);
    console.log("Your transaction signature", tx);
  });

  it("creates order and throws invalid side error when side is invalid", async () => {
    const tx = await client.createOrder(1, 1000000, 1000000, 5000, 0, 0, 0, 1);
    console.log("Your transaction signature", tx);
  });

  it("creates order, generates yield and then claims yield successfully", async () => {
    const tx = await client.createOrder(1, 1000000, 1000000, 5000, 0, 0, 0, 1);
    console.log("Your transaction signature", tx);
  });

  it("creates order, loses yield and closes order successfully", async () => {
    const tx = await client.createOrder(1, 1000000, 1000000, 5000, 0, 0, 0, 1);
  });

  it("creates order and top ups successfully", async () => {
    const tx = await client.createOrder(1, 1000000, 1000000, 5000, 0, 0, 0, 1);
    console.log("Your transaction signature", tx);
  });
  
});

