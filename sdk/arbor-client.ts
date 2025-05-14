import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ArborProgram } from "../target/types/arbor_program";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { ClaimYieldInput, CloseOrderInput, CreateOrderInput, GlobalConfigAccount, OpenOrder, TopUpOrderInput } from "./types";
import * as spl from "@solana/spl-token";
import { ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

export class ArborClient {
  private program: Program<ArborProgram>;
  private provider: anchor.AnchorProvider;

  constructor(provider: anchor.AnchorProvider) {
    this.provider = provider;
    this.program = anchor.workspace.ArborProgram as Program<ArborProgram>;
  }

  private orderCache: Map<PublicKey, OpenOrder> = new Map();

  public static ARBOR_PROGRAM_ID = new PublicKey("82kzsHhGThuVdNvUm6eCchTL9CYTp6s7bufFZ3ARBtYH");

  private GLOBAL_CONFIG_ACCOUNT: PublicKey;
  private PROGRAM_AUTHORITY_ACCOUNT: PublicKey;
  private TREASURY_VAULT_ADDRESS: PublicKey;
  private globalConfig: GlobalConfigAccount;

  // Helper to derive PDA addresses
  static findOrderAddress(owner: PublicKey, seed: number): [PublicKey, number] {
    const seedBuffer = new anchor.BN(seed).toArrayLike(Buffer, "le", 8);
    return PublicKey.findProgramAddressSync(
      [Buffer.from("order"), owner.toBuffer(), seedBuffer],
      ArborClient.ARBOR_PROGRAM_ID
    );
  }

  static async findGlobalConfigAddress(): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      this.ARBOR_PROGRAM_ID
    );
  }

  static async findProgramAuthorityAddress(): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddressSync(
      [Buffer.from("auth")],
      this.ARBOR_PROGRAM_ID
    );
  }

    static findVaultAddress(order: PublicKey, protocol: "jupit" | "drift"): [PublicKey, number] {
      return PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), Buffer.from(protocol), order.toBuffer()],
        this.ARBOR_PROGRAM_ID
      );
    }

  async getVaultBalance(connection: Connection, vaultAddress: PublicKey) {
      const balanceInfo = await connection.getTokenAccountBalance(vaultAddress);
      return {
        uiAmount: balanceInfo.value.uiAmount,
        amount: balanceInfo.value.amount,           // raw amount as string
        decimals: balanceInfo.value.decimals
      };
  }

  public async getGlobalConfigAddress(): Promise<PublicKey> {
    return this.GLOBAL_CONFIG_ACCOUNT || (this.GLOBAL_CONFIG_ACCOUNT = (await ArborClient.findGlobalConfigAddress())[0]);
  }

  public async getProgramAuthorityAddress(): Promise<PublicKey> {
    return this.PROGRAM_AUTHORITY_ACCOUNT || (this.PROGRAM_AUTHORITY_ACCOUNT = (await ArborClient.findProgramAuthorityAddress())[0]);
  }

  private async addOrderToCache(order: PublicKey, driftVault: PublicKey, jupiterVault: PublicKey, driftBump: number, jupiterBump: number) {

    this.orderCache.set(order, {
      order,
      driftVault,
      jupiterVault,
      driftBump,
      jupiterBump
    });
  }

  public async isTreasuryVaultInitialized(): Promise<boolean> {

    const treasuryAccount = await this.provider.connection.getAccountInfo(this.TREASURY_VAULT_ADDRESS);

    return treasuryAccount ? true : false;
  }

  public async getTreasuryVaultAddress(): Promise<PublicKey> {

    const programAuthorityAddress = await this.getProgramAuthorityAddress();
    if (!this.globalConfig) {
      throw new Error("Global config not initialized, please call initializeConfig first");
    }
    if (! await this.isTreasuryVaultInitialized()) {
      this.TREASURY_VAULT_ADDRESS = await this.createTreasuryVault(this.provider, this.globalConfig.usdcMint, programAuthorityAddress);
    }
    return this.TREASURY_VAULT_ADDRESS;
  }

  public async getUSDCBalanceOf(connection: Connection, pubkey: PublicKey) {
    const ata = await spl.getAssociatedTokenAddress(this.globalConfig.usdcMint, pubkey);
    const balance = await connection.getTokenAccountBalance(ata);
    return {
      uiAmount: balance.value.uiAmount,
      amount: balance.value.amount,
      decimals: balance.value.decimals
    };
  }

  public async createTreasuryVault(
    provider: anchor.AnchorProvider,
    usdcMint: PublicKey,
    programAuthority: PublicKey
  ): Promise<PublicKey> {
    const payer = provider.wallet;
  
    const treasuryVault = await getAssociatedTokenAddressSync(
      usdcMint,
      programAuthority,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
  
    const existingAccount = await provider.connection.getAccountInfo(treasuryVault);
    if (existingAccount) {
      console.log("Treasury vault already exists:", treasuryVault.toBase58());
      return treasuryVault;
    }
  
    const ix = createAssociatedTokenAccountInstruction(
      payer.publicKey,
      treasuryVault,
      programAuthority,
      usdcMint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
  
    const tx = new Transaction().add(ix);
  
    const signature = await provider.sendAndConfirm(tx, []);
    console.log("Treasury vault created with signature:", signature);
  
    return treasuryVault;
  }

  async ensureAta(mint: PublicKey, owner: PublicKey): Promise<PublicKey> {
    const ata = await spl.getAssociatedTokenAddress(mint, owner);
    const info = await this.provider.connection.getAccountInfo(ata);
    if (!info) {
      const ix = createAssociatedTokenAccountInstruction(
        this.provider.wallet.publicKey,
        ata,
        owner,
        mint
      );
      const tx = new Transaction().add(ix);
      await this.provider.sendAndConfirm(tx, []);
    }
    return ata;
  }

  // Program Instructions
  async createOrder( {
    signer,
    seed,
    jupPerpAmount,
    driftPerpAmount,
    ratioBps,
    driftPerpIdx,
    jupPerpIdx,
    driftSide,
    jupSide
  }: CreateOrderInput) {
    console.log("creating order...");
    const [orderAddress] = await ArborClient.findOrderAddress(signer.publicKey, seed);
    const globalConfigAddress = await this.getGlobalConfigAddress();
    const programAuthorityAddress = await this.getProgramAuthorityAddress();
    const [jupiterVaultAddress, jupiterBump] = await ArborClient.findVaultAddress(orderAddress, "jupit");
    const [driftVaultAddress, driftBump] = await ArborClient.findVaultAddress(orderAddress, "drift");
    const globalConfig = await this.getGlobalConfig();
    
    const ownerAta = await anchor.utils.token.associatedAddress({
      mint: globalConfig.usdcMint,
      owner: signer.publicKey,
    });

    // verify accounts exist
    console.log("globalConfigAddress", globalConfigAddress.toBase58());
    console.log("programAuthorityAddress", programAuthorityAddress.toBase58());
    console.log("jupiterVaultAddress", jupiterVaultAddress.toBase58());
    console.log("driftVaultAddress", driftVaultAddress.toBase58());
    console.log("ownerAta", ownerAta.toBase58());
    console.log("orderAddress", orderAddress.toBase58());


    const tx =await this.program.methods
      .createOrder(
        new anchor.BN(seed),
        new anchor.BN(jupPerpAmount),
        new anchor.BN(driftPerpAmount),
        new anchor.BN(ratioBps),
        new anchor.BN(driftPerpIdx),
        new anchor.BN(jupPerpIdx),
        driftSide,
        jupSide
      )
      .accountsStrict({
        owner: signer.publicKey,
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
      }).signers([signer])
      .rpc();

      await this.addOrderToCache(orderAddress, driftVaultAddress, jupiterVaultAddress, driftBump, jupiterBump);

      return orderAddress;
  }

  async closeOrder({seed, signer}: CloseOrderInput) {
    const [orderAddress] = await ArborClient.findOrderAddress(signer.publicKey, seed);
    const [globalConfigAddress] = await ArborClient.findGlobalConfigAddress();
    const [programAuthorityAddress] = await ArborClient.findProgramAuthorityAddress();
    const [jupiterVaultAddress] = await ArborClient.findVaultAddress(orderAddress, "jupit");
    const [driftVaultAddress] = await ArborClient.findVaultAddress(orderAddress, "drift");
    const treasuryVault = await this.getTreasuryVaultAddress();
    const globalConfig = await this.program.account.globalConfig.fetch(globalConfigAddress);
    
    const ownerAta = await anchor.utils.token.associatedAddress({
      mint: globalConfig.usdcMint,
      owner: signer.publicKey
    });

    return await this.program.methods
      .closeOrder()
      .accountsStrict({
        owner: signer.publicKey,
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
      }).signers([signer])
      .rpc();
  }

  async claimYield({seed, driftYield, jupiterYield, signer} : ClaimYieldInput) {
    const [orderAddress] = await ArborClient.findOrderAddress(signer.publicKey, seed);
    const [globalConfigAddress] = await ArborClient.findGlobalConfigAddress();
    const [programAuthorityAddress] = await ArborClient.findProgramAuthorityAddress();
    const [jupiterVaultAddress] = await ArborClient.findVaultAddress(orderAddress, "jupit");
    const [driftVaultAddress] = await ArborClient.findVaultAddress(orderAddress, "drift");

    const globalConfig = await this.program.account.globalConfig.fetch(globalConfigAddress);
    
    const ownerAta = await anchor.utils.token.associatedAddress({
      mint: globalConfig.usdcMint,
      owner: signer.publicKey
    });

    return await this.program.methods
      .claimYield(new anchor.BN(driftYield), new anchor.BN(jupiterYield))
      .accountsStrict({
        owner: signer.publicKey,
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
      }).signers([signer])
      .rpc();
  }

  async topUpOrder({seed, driftAmount, jupiterAmount, treasuryVault, signer, order}: TopUpOrderInput) {
    
    if (!order) {
      throw Error('please add an Order pubkey');
    }

    const [globalConfigAddress] = await ArborClient.findGlobalConfigAddress();
    const [programAuthorityAddress] = await ArborClient.findProgramAuthorityAddress();
    const [jupiterVaultAddress] = await ArborClient.findVaultAddress(order, "jupit");
    const [driftVaultAddress] = await ArborClient.findVaultAddress(order, "drift");

    const globalConfig = await this.program.account.globalConfig.fetch(globalConfigAddress);
    
    const ownerAta = await anchor.utils.token.associatedAddress({
      mint: globalConfig.usdcMint,
      owner: signer.publicKey
    });

    // console.log("about to top up order", order.toBase58());

    return await this.program.methods
      .topUpOrder(new anchor.BN(driftAmount), new anchor.BN(jupiterAmount))
      .accountsPartial({
        owner: signer.publicKey,
        ownerAta,
        usdcMint: globalConfig.usdcMint,
        order,
        globalConfig: globalConfigAddress,
        programAuthority: programAuthorityAddress,
        jupiterVault: jupiterVaultAddress,
        driftVault: driftVaultAddress,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
      }).signers([signer])
      .rpc();
  }


  async initializeConfig(feeBps: number, admin: PublicKey, usdcMint: PublicKey) {
    const [globalConfigAddress, configBump] = await ArborClient.findGlobalConfigAddress();
    const [programAuthorityAddress, authBump] = await ArborClient.findProgramAuthorityAddress();
    
    try {
        // Initialize the accounts
        const tx = await this.program.methods
            .initializeConfig(
                new anchor.BN(feeBps),
                admin,
                usdcMint,
            )
            .accountsPartial({
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

        this.GLOBAL_CONFIG_ACCOUNT = globalConfigAddress;
        this.PROGRAM_AUTHORITY_ACCOUNT = programAuthorityAddress;
        this.globalConfig = config;

        this.TREASURY_VAULT_ADDRESS = await this.createTreasuryVault(this.provider, this.globalConfig.usdcMint, this.PROGRAM_AUTHORITY_ACCOUNT);

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
  async getOrder(seed: number, signer: Keypair) {
    const [orderAddress] = await ArborClient.findOrderAddress(signer.publicKey, seed);
    return await this.program.account.order.fetch(orderAddress);
  }


  async getOpenOrderByAddress(orderAddress: PublicKey) {
    return this.orderCache.get(orderAddress);
  }

  async getOpenOrder(seed: number, signer: Keypair) {
    const [orderAddress] = await ArborClient.findOrderAddress(signer.publicKey, seed);
    return this.orderCache.get(orderAddress);
  }

  async getAllOpenOrders(){
    const orders = await this.program.account.order.all();
    return orders.map((order) => this.orderCache.get(order.account.owner));
  }

  async getOpenOrderByUser(user: PublicKey) {
    const orders = await this.getAllOrderProgramAccounts();
    const orderAccountsForUser = orders.filter((order) => order.account.owner.equals(user));
    return orderAccountsForUser.map((order) => this.orderCache.get(order.publicKey));
  }

  async getAllOrders() {
    return (await this.getAllOrderProgramAccounts()).map((order) => order.account);
  }

  async getAllOrderProgramAccounts() {
    return await this.program.account.order.all();
  }

  async getGlobalConfig() {
    const [globalConfigAddress] = await ArborClient.findGlobalConfigAddress();
    return await this.program.account.globalConfig.fetch(globalConfigAddress);
  }
} 