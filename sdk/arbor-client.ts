import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ArborProgram } from "../target/types/arbor_program";
import { PublicKey } from "@solana/web3.js";
import { ClaimYieldInput, CloseOrderInput, CreateOrderInput, TopUpOrderInput } from "./types";

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
  async createOrder( {
    seed,
    jupPerpAmount,
    driftPerpAmount,
    ratioBps,
    driftPerpIdx,
    jupPerpIdx,
    driftSide,
    jupSide
  }: CreateOrderInput) {
    const [orderAddress] = await ArborClient.findOrderAddress(this.provider.wallet.publicKey!, seed);
    const [globalConfigAddress] = await ArborClient.findGlobalConfigAddress();
    const [programAuthorityAddress] = await ArborClient.findProgramAuthorityAddress();
    const [jupiterVaultAddress] = await ArborClient.findVaultAddress(orderAddress, "jupit");
    const [driftVaultAddress] = await ArborClient.findVaultAddress(orderAddress, "drift");

    // console.log("orderAddress", orderAddress.toBase58());
    // console.log("globalConfigAddress", globalConfigAddress.toBase58());
    // console.log("programAuthorityAddress", programAuthorityAddress.toBase58());
    // console.log("jupiterVaultAddress", jupiterVaultAddress.toBase58());
    // console.log("driftVaultAddress", driftVaultAddress.toBase58());


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

  async closeOrder({seed, treasuryVault}: CloseOrderInput) {
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

  async claimYield({seed} : ClaimYieldInput) {
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

  async topUpOrder({seed, amount, treasuryVault}: TopUpOrderInput) {
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


  async initializeConfig(feeBps: number, admin: PublicKey, usdcMint: PublicKey) {
    const [globalConfigAddress, configBump] = await ArborClient.findGlobalConfigAddress();
    const [programAuthorityAddress, authBump] = await ArborClient.findProgramAuthorityAddress();

    console.log('Initializing config with:');
    console.log('- Fee BPS:', feeBps);
    console.log('- Admin:', admin.toBase58());
    console.log('- USDC Mint:', usdcMint.toBase58());
    console.log('- Config Bump:', configBump);
    console.log('- Auth Bump:', authBump);

    try {
        // Initialize the accounts
        const tx = await this.program.methods
            .initializeConfig(
                new anchor.BN(feeBps),
                admin,
                usdcMint,
                configBump,
                authBump
            )
            .accountsStrict({
                signer: this.provider.wallet.publicKey,
                globalConfig: globalConfigAddress,
                programAuthority: programAuthorityAddress,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();

        console.log('Config initialized successfully:', tx);

        // Verify the account was created
        const accountInfo = await this.provider.connection.getAccountInfo(globalConfigAddress);
        if (!accountInfo) {
            throw new Error("GlobalConfig account not created");
        }

        // Verify the account can be deserialized
        const config = await this.program.account.globalConfig.fetch(globalConfigAddress);
        console.log('Config initialized with:', {
            feeBps: config.feeBps.toNumber(),
            admin: config.admin.toBase58(),
            usdcMint: config.usdcMint.toBase58(),
            bump: config.bump
        });

        return tx;
    } catch (error) {
        console.error('Error initializing config:', error);
        
        // Additional debug: check if account exists but fails to deserialize
        try {
            const accountInfo = await this.provider.connection.getAccountInfo(globalConfigAddress);
            console.log('Account exists:', accountInfo !== null);
            if (accountInfo) {
                console.log('Account data length:', accountInfo.data.length);
            }
        } catch (e) {
            console.error('Error checking account:', e);
        }
        
        throw error;
    }
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