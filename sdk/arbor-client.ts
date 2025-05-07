import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ArborProgram } from "../target/types/arbor_program";
import { PublicKey } from "@solana/web3.js";

export class ArborClient {
  private program: Program<ArborProgram>;
  private provider: anchor.AnchorProvider;

  constructor(provider: anchor.AnchorProvider) {
    this.provider = provider;
    this.program = anchor.workspace.ArborProgram as Program<ArborProgram>;
  }

  // Helper to derive PDA addresses
  static async findOrderAddress(owner: PublicKey, seed: number): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddressSync(
      [Buffer.from("order"), owner.toBuffer(), new anchor.BN(seed).toArrayLike(Buffer, "le", 8)],
      new PublicKey("82kzsHhGThuVdNvUm6eCchTL9CYTp6s7bufFZ3ARBtYH")
    );
  }

  static async findGlobalConfigAddress(): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      new PublicKey("82kzsHhGThuVdNvUm6eCchTL9CYTp6s7bufFZ3ARBtYH")
    );
  }

  static async findProgramAuthorityAddress(): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddressSync(
      [Buffer.from("auth")],
      new PublicKey("82kzsHhGThuVdNvUm6eCchTL9CYTp6s7bufFZ3ARBtYH")
    );
  }

  static async findVaultAddress(order: PublicKey, protocol: "jupit" | "drift"): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from(protocol), order.toBuffer()],
      new PublicKey("82kzsHhGThuVdNvUm6eCchTL9CYTp6s7bufFZ3ARBtYH")
    );
  }

  // Program Instructions
  async createOrder(
    seed: number,
    jupPerpAmount: number,
    driftPerpAmount: number,
    ratioBps: number,
    driftPerpIdx: number,
    jupPerpIdx: number,
    driftSide: number,
    jupSide: number
  ) {
    const [orderAddress] = await ArborClient.findOrderAddress(this.provider.wallet.publicKey!, seed);
    const [globalConfigAddress] = await ArborClient.findGlobalConfigAddress();
    const [programAuthorityAddress] = await ArborClient.findProgramAuthorityAddress();
    const [jupiterVaultAddress] = await ArborClient.findVaultAddress(orderAddress, "jupit");
    const [driftVaultAddress] = await ArborClient.findVaultAddress(orderAddress, "drift");

    const globalConfig = await this.program.account.globalConfig.fetch(globalConfigAddress);
    
    const ownerAta = await anchor.utils.token.associatedAddress({
      mint: globalConfig.usdcMint,
      owner: this.provider.wallet.publicKey!
    });

    return await this.program.methods
      .createOrder(
        new anchor.BN(seed),
        0, // bumps_in
        new anchor.BN(jupPerpAmount),
        new anchor.BN(driftPerpAmount),
        new anchor.BN(ratioBps),
        new anchor.BN(driftPerpIdx),
        new anchor.BN(jupPerpIdx),
        driftSide,
        jupSide
      )
      .accountsStrict({
        owner: this.provider.wallet.publicKey,
        ownerAta,
        usdcMint: globalConfig.usdcMint,
        order: orderAddress,
        globalConfig: globalConfigAddress,
        programAuthority: programAuthorityAddress,
        jupiterVault: jupiterVaultAddress,
        driftVault: driftVaultAddress,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
      })
      .rpc();
  }

  async closeOrder(seed: number, treasuryVault: PublicKey) {
    const [orderAddress] = await ArborClient.findOrderAddress(this.provider.wallet.publicKey!, seed);
    const [globalConfigAddress] = await ArborClient.findGlobalConfigAddress();
    const [programAuthorityAddress] = await ArborClient.findProgramAuthorityAddress();
    const [jupiterVaultAddress] = await ArborClient.findVaultAddress(orderAddress, "jupit");
    const [driftVaultAddress] = await ArborClient.findVaultAddress(orderAddress, "drift");

    const globalConfig = await this.program.account.globalConfig.fetch(globalConfigAddress);
    
    const ownerAta = await anchor.utils.token.associatedAddress({
      mint: globalConfig.usdcMint,
      owner: this.provider.wallet.publicKey!
    });

    return await this.program.methods
      .closeOrder()
      .accountsStrict({
        owner: this.provider.wallet.publicKey,
        ownerAta,
        usdcMint: globalConfig.usdcMint,
        order: orderAddress,
        globalConfig: globalConfigAddress,
        programAuthority: programAuthorityAddress,
        jupiterVault: jupiterVaultAddress,
        driftVault: driftVaultAddress,
        treasuryVault,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
      })
      .rpc();
  }

  async claimYield(seed: number) {
    const [orderAddress] = await ArborClient.findOrderAddress(this.provider.wallet.publicKey!, seed);
    const [globalConfigAddress] = await ArborClient.findGlobalConfigAddress();
    const [programAuthorityAddress] = await ArborClient.findProgramAuthorityAddress();
    const [jupiterVaultAddress] = await ArborClient.findVaultAddress(orderAddress, "jupit");
    const [driftVaultAddress] = await ArborClient.findVaultAddress(orderAddress, "drift");

    const globalConfig = await this.program.account.globalConfig.fetch(globalConfigAddress);
    
    const ownerAta = await anchor.utils.token.associatedAddress({
      mint: globalConfig.usdcMint,
      owner: this.provider.wallet.publicKey!
    });

    return await this.program.methods
      .claimYield()
      .accountsStrict({
        owner: this.provider.wallet.publicKey,
        ownerAta,
        usdcMint: globalConfig.usdcMint,
        order: orderAddress,
        globalConfig: globalConfigAddress,
        programAuthority: programAuthorityAddress,
        jupiterVault: jupiterVaultAddress,
        driftVault: driftVaultAddress,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
      })
      .rpc();
  }

  async topUpOrder(seed: number, amount: number, treasuryVault: PublicKey) {
    const [orderAddress] = await ArborClient.findOrderAddress(this.provider.wallet.publicKey!, seed);
    const [globalConfigAddress] = await ArborClient.findGlobalConfigAddress();
    const [programAuthorityAddress] = await ArborClient.findProgramAuthorityAddress();
    const [jupiterVaultAddress] = await ArborClient.findVaultAddress(orderAddress, "jupit");
    const [driftVaultAddress] = await ArborClient.findVaultAddress(orderAddress, "drift");

    const globalConfig = await this.program.account.globalConfig.fetch(globalConfigAddress);
    
    const ownerAta = await anchor.utils.token.associatedAddress({
      mint: globalConfig.usdcMint,
      owner: this.provider.wallet.publicKey!
    });

    return await this.program.methods
      .topUpOrder(new anchor.BN(amount))
      .accountsStrict({
        owner: this.provider.wallet.publicKey,
        ownerAta,
        usdcMint: globalConfig.usdcMint,
        order: orderAddress,
        globalConfig: globalConfigAddress,
        programAuthority: programAuthorityAddress,
        jupiterVault: jupiterVaultAddress,
        driftVault: driftVaultAddress,
        treasuryVault,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
      })
      .rpc();
  }

  // Account Getters
  async getOrder(seed: number) {
    const [orderAddress] = await ArborClient.findOrderAddress(this.provider.wallet.publicKey!, seed);
    return await this.program.account.order.fetch(orderAddress);
  }

  async getAllOrders() {
    const orders = await this.program.account.order.all();
    return orders.map((order) => order.account);
  }

  async getGlobalConfig() {
    const [globalConfigAddress] = await ArborClient.findGlobalConfigAddress();
    return await this.program.account.globalConfig.fetch(globalConfigAddress);
  }
} 