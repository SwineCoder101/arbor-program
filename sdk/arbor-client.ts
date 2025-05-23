import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ArborProgram } from "./arbor_program";
import * as ArborProgramIDL from "./arbor_program.json";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { ClaimYieldInput, CloseOrderInput, CreateOrderInput, GlobalConfigAccount, OpenOrder, TopUpOrderInput, TransferYieldToProtocolVaultsInput, WithdrawFromTreasuryInput } from "./types";
import * as spl from "@solana/spl-token";
import { ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getAssociatedTokenAddressSync, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";


export const IDL = ArborProgramIDL as ArborProgram;

export class ArborClient {
  private program: Program<ArborProgram>;
  private provider: anchor.AnchorProvider;

  constructor(provider: anchor.AnchorProvider) {
    this.provider = provider;
    this.program = new Program(IDL, provider);
    console.log("Provider wallet:", this.provider.wallet.publicKey.toBase58());
    console.log("Anchor workspace program ID:", this.program.programId.toBase58());
    
    // Initialize properties to avoid linter errors
    this.GLOBAL_CONFIG_ACCOUNT = PublicKey.default;
    this.PROGRAM_AUTHORITY_ACCOUNT = PublicKey.default;
    this.TREASURY_VAULT_ADDRESS = PublicKey.default;
    this.globalConfig = {} as GlobalConfigAccount;
  }

  private orderCache: Map<PublicKey, OpenOrder> = new Map();

  public static ARBOR_PROGRAM_ID = new PublicKey(ArborProgramIDL.address);

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

    static findVaultAddress(order: PublicKey, protocol: "jup" | "drift"): [PublicKey, number] {
      return PublicKey.findProgramAddressSync(
        [Buffer.from(`vault-${protocol}`), order.toBuffer()],
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
    return (await ArborClient.findGlobalConfigAddress())[0];
  }

  public async getProgramAuthorityAddress(): Promise<PublicKey> {
    return (await ArborClient.findProgramAuthorityAddress())[0];
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

  public async getTreasuryVaultAddress(usdcMint?: string): Promise<PublicKey> {
    try {
      const programAuthorityAddress = await this.getProgramAuthorityAddress();
      if (!this.globalConfig) {
        throw new Error("Global config not initialized, please call initializeConfig first");
      }

      // Use provided USDC mint if valid, otherwise fall back to global config
      let useUsdcMint: PublicKey;
      if (usdcMint) {
        try {
          useUsdcMint = new PublicKey(usdcMint);
        } catch (e) {
          console.warn("Invalid USDC mint provided, using global config mint");
          useUsdcMint = this.globalConfig.usdcMint;
        }
      } else {
        useUsdcMint = this.globalConfig.usdcMint;
      }

      console.log("Using USDC mint:", useUsdcMint.toBase58());
      console.log("Program authority:", programAuthorityAddress.toBase58());

      // Get the treasury vault address
      const treasuryVault = getAssociatedTokenAddressSync(
        useUsdcMint,
        programAuthorityAddress,
        true,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Check if treasury vault already exists
      const vaultInfo = await this.provider.connection.getAccountInfo(treasuryVault);
      if (vaultInfo) {
        console.log("Using existing treasury vault:", treasuryVault.toBase58());
        this.TREASURY_VAULT_ADDRESS = treasuryVault;
        return treasuryVault;
      }

      // Create new treasury vault if needed
      this.TREASURY_VAULT_ADDRESS = await this.createTreasuryVault(
        this.provider,
        useUsdcMint,
        programAuthorityAddress
      );
      
      console.log("Created new treasury vault:", this.TREASURY_VAULT_ADDRESS.toBase58());
      return this.TREASURY_VAULT_ADDRESS;
    } catch (error) {
      console.error("Error in getTreasuryVaultAddress:", error);
      throw error;
    }
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

  async findOrder(user: PublicKey, seed: number) {
    const [orderAddress] = await ArborClient.findOrderAddress(user, seed);
    const order = await this.program.account.order.fetch(orderAddress);
    return order;
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
    const globalConfigAddress = await this.getGlobalConfigAddress();
    const programAuthorityAddress = await this.getProgramAuthorityAddress();
    const globalConfig = await this.getGlobalConfig();
    
    const ownerAta = await anchor.utils.token.associatedAddress({
      mint: globalConfig.usdcMint,
      owner: signer.publicKey,
    });

    const {orderAddress, driftVault : driftVaultAddress, jupiterVault : jupiterVaultAddress, driftBump, jupiterBump} = await this.initializeProtocolVaults(signer, seed);



    // verify accounts exist
    // console.log("globalConfigAddress", globalConfigAddress.toBase58());
    // console.log("programAuthorityAddress", programAuthorityAddress.toBase58());
    // console.log("jupiterVaultAddress", jupiterVaultAddress.toBase58());
    // console.log("driftVaultAddress", driftVaultAddress.toBase58());
    // console.log("ownerAta", ownerAta.toBase58());
    // console.log("orderAddress", orderAddress.toBase58());


    const tx = await this.program.methods
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
      }).signers([signer])
      .rpc();

      await this.addOrderToCache(orderAddress, driftVaultAddress, jupiterVaultAddress, driftBump, jupiterBump);

      return orderAddress;
  }

  async closeOrder({seed, signer}: CloseOrderInput) {
    const [orderAddress] = await ArborClient.findOrderAddress(signer.publicKey, seed);
    const [globalConfigAddress] = await ArborClient.findGlobalConfigAddress();
    const [programAuthorityAddress] = await ArborClient.findProgramAuthorityAddress();
    const [jupiterVaultAddress] = await ArborClient.findVaultAddress(orderAddress, "jup");
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
      }).signers([signer])
      .rpc();
  }

  async claimYield({seed, driftYield, jupiterYield, signer} : ClaimYieldInput) {
    const [orderAddress] = await ArborClient.findOrderAddress(signer.publicKey, seed);
    const [globalConfigAddress] = await ArborClient.findGlobalConfigAddress();
    const [programAuthorityAddress] = await ArborClient.findProgramAuthorityAddress();
    const [jupiterVaultAddress] = await ArborClient.findVaultAddress(orderAddress, "jup");
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
    const [jupiterVaultAddress] = await ArborClient.findVaultAddress(order, "jup");
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


  async transferYieldToProtocolVaults({seed, signer, jupiterAmount, driftAmount}: TransferYieldToProtocolVaultsInput) {
    const [orderAddress] = await ArborClient.findOrderAddress(signer.publicKey, seed);
    const [globalConfigAddress] = await ArborClient.findGlobalConfigAddress();
    const [programAuthorityAddress] = await ArborClient.findProgramAuthorityAddress();
    const [jupiterVaultAddress] = await ArborClient.findVaultAddress(orderAddress, "jup");
    const [driftVaultAddress] = await ArborClient.findVaultAddress(orderAddress, "drift");

    const globalConfig = await this.program.account.globalConfig.fetch(globalConfigAddress);
    
    const ownerAta = await anchor.utils.token.associatedAddress({
      mint: globalConfig.usdcMint,
      owner: signer.publicKey
    });
    
    // create spl transfer function for signer

    const transferJupiterIx = spl.createTransferInstruction(
      ownerAta,
      jupiterVaultAddress,
      signer.publicKey,
      jupiterAmount
    );

    const transferDriftIx = spl.createTransferInstruction(
      ownerAta,
      driftVaultAddress,
      signer.publicKey,
      driftAmount
    );

    const tx = new Transaction().add(transferJupiterIx, transferDriftIx);

    return await this.provider.sendAndConfirm(tx, [signer]);
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
  async withdrawFromTreasury(amount: number, admin: Keypair) {

    const programAuthorityAddress = await this.getProgramAuthorityAddress();
    if (!this.TREASURY_VAULT_ADDRESS) {
        throw Error('Treasury vault not initialized');
    }

    if (!this.GLOBAL_CONFIG_ACCOUNT) {
        throw Error('Global config not initialized');
    }

    if (this.globalConfig.admin.toBase58() !== admin.publicKey.toBase58()) {
        throw Error('Invalid admin account');
    }

    const adminAta = await getOrCreateAssociatedTokenAccount(
        this.provider.connection,
        admin,
        this.globalConfig.usdcMint,
        admin.publicKey,
        true,
    );

    return await this.program.methods
        .withdrawFromTreasury(new anchor.BN(amount))
        .accountsPartial({
            admin: admin.publicKey,
            treasuryVault: this.TREASURY_VAULT_ADDRESS,
            globalConfig: this.GLOBAL_CONFIG_ACCOUNT,
            adminAta: adminAta.address,
            usdcMint: this.globalConfig.usdcMint, // Add missing
            programAuthority: programAuthorityAddress, // Add missing
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
  }

  async keeperWithdraw(
    driftAmount: number, 
    jupiterAmount: number,
    order: PublicKey,
    admin: Keypair
) {

    const [jupiterVaultAddress] = await ArborClient.findVaultAddress(order, "jup");
    const [driftVaultAddress] = await ArborClient.findVaultAddress(order, "drift");

    if (!this.GLOBAL_CONFIG_ACCOUNT) {
        throw Error('Global config not initialized');
    }

    if (this.globalConfig.admin.toBase58() !== admin.publicKey.toBase58()) {
        throw Error('Invalid admin account');
    }

    return await this.program.methods
        .keeperWithdraw(
            new anchor.BN(driftAmount),
            new anchor.BN(jupiterAmount)
        )
        .accountsPartial({
            admin: admin.publicKey,
            usdcMint: this.globalConfig.usdcMint,
            globalConfig: this.GLOBAL_CONFIG_ACCOUNT,
            programAuthority: this.PROGRAM_AUTHORITY_ACCOUNT,
            jupiterVault: jupiterVaultAddress,
            driftVault: driftVaultAddress,
            treasuryVault: this.TREASURY_VAULT_ADDRESS,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
}

  async initializeProtocolVaults(signer: Keypair, seed: number) {

    if (!this.globalConfig) {
      throw Error('Global config not initialized, please call initializeConfig first');
    }

    const [orderAddress] = await ArborClient.findOrderAddress(signer.publicKey, seed);

    const tx = await this.program.methods
      .createProtocolVaults(orderAddress)
      .accountsPartial({
        owner: signer.publicKey,
        usdcMint: this.globalConfig.usdcMint,
      }).signers([signer])
      .rpc();

      const [jupiterVault, jupiterBump] = await ArborClient.findVaultAddress(orderAddress, "jup");
      const [driftVault, driftBump] = await ArborClient.findVaultAddress(orderAddress, "drift");

      return {orderAddress, jupiterVault, driftVault, jupiterBump, driftBump};

  }

  // Account Getters
  async getOrder(seed: number, signer: Keypair) {
    const [orderAddress] = await ArborClient.findOrderAddress(signer.publicKey, seed);
    return await this.program.account.order.fetch(orderAddress);
  }


  async getOpenOrderByAddress(orderAddress: PublicKey) {
    return this.orderCache.get(orderAddress);
  }

  async getOpenOrder(seed: number, user: PublicKey) {
    const [orderAddress] = await ArborClient.findOrderAddress(user, seed);
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

  async setGlobalConfig() {
    const newGlobalConfig = await this.getGlobalConfig();
    this.globalConfig = newGlobalConfig;
    this.GLOBAL_CONFIG_ACCOUNT = (await ArborClient.findGlobalConfigAddress())[0];
  }
} 