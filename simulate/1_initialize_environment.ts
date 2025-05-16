import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as spl from "@solana/spl-token";
import { ArborClient } from "../sdk/arbor-client";
import { loadKeypair } from "./util";
import * as fs from 'fs';
import * as path from 'path';

interface AccountInfo {
    admin: string;
    trader: string;
    usdcReserve: string;
    usdcMint: string;
    usdcReserveAta: string;
    traderAta: string;
    lastMintToReserve: string;
    lastTransferToTrader: string;
}

interface InitStatus {
    isInitialized: boolean;
    lastInitTimestamp: number;
}

async function main() {
    // Initialize connection to devnet
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    
    // Define paths for state files
    const accountInfoPath = path.join(__dirname, 'account_info.json');
    const initStatusPath = path.join(__dirname, 'init_status.json');
    
    let admin: Keypair;
    let trader: Keypair;
    let usdcReserve: Keypair;
    let deployer: Keypair;
    
    // Load keypairs
    try {
        admin = loadKeypair("./simulate/admin-keypair.json");
        trader = loadKeypair("./simulate/trader-keypair.json");
        usdcReserve = loadKeypair("./simulate/usdc-reserve-keypair.json");
        deployer = loadKeypair("./Turbin3-wallet.json")
        
        console.log("Successfully loaded keypairs:");
        console.log("Admin:", admin.publicKey.toBase58());
        console.log("Trader:", trader.publicKey.toBase58());
        console.log("USDC Reserve:", usdcReserve.publicKey.toBase58());
    } catch (error) {
        console.error("Failed to load keypairs:", error);
        process.exit(1);
    }

    // Create provider and client
    const wallet = new anchor.Wallet(deployer);
    const provider = new anchor.AnchorProvider(connection, wallet, {
        commitment: "confirmed",
    });
    anchor.setProvider(provider);

    console.log("initializing client.....")
    const client = new ArborClient(provider);

    // Check initialization status
    let initStatus: InitStatus = { isInitialized: false, lastInitTimestamp: 0 };
    
    if (fs.existsSync(initStatusPath)) {
        initStatus = JSON.parse(fs.readFileSync(initStatusPath, 'utf8'));
        if (initStatus.isInitialized) {
            console.log("Environment already initialized. Skipping initialization...");
            return;
        }
    }

    try {
        // Check if global config exists
        const globalConfigAddress = await client.getGlobalConfigAddress();
        const globalConfigInfo = await connection.getAccountInfo(globalConfigAddress);

        console.log("global config address: ", globalConfigAddress.toBase58());
        console.log(globalConfigInfo);
        
        // Load existing account info if it exists
        let accountInfo: AccountInfo = {
            admin: admin.publicKey.toBase58(),
            trader: trader.publicKey.toBase58(),
            usdcReserve: usdcReserve.publicKey.toBase58(),
            usdcMint: "",
            usdcReserveAta: "",
            traderAta: "",
            lastMintToReserve: "",
            lastTransferToTrader: ""
        };

        if (fs.existsSync(accountInfoPath)) {
            const existingInfo = JSON.parse(fs.readFileSync(accountInfoPath, 'utf8'));
            accountInfo = { ...accountInfo, ...existingInfo };
            console.log("Loaded existing account info");
        }

        if (globalConfigInfo) {
            console.log("Global config already exists. Checking configuration...");
            const globalConfig = await client.getGlobalConfig();
            console.log("Current global config:", {
                feeBps: globalConfig.feeBps.toNumber(),
                admin: globalConfig.admin.toBase58(),
                usdcMint: globalConfig.usdcMint.toBase58()
            });

            // Check if treasury vault exists
            const treasuryVault = await client.getTreasuryVaultAddress();
            const treasuryInfo = await connection.getAccountInfo(treasuryVault);
            if (treasuryInfo) {
                console.log("Treasury vault already exists:", treasuryVault.toBase58());
            }

            // Check balances
            const usdcMint = globalConfig.usdcMint;
            const usdcReserveAta = await spl.getAssociatedTokenAddress(usdcMint, usdcReserve.publicKey);
            const traderAta = await spl.getAssociatedTokenAddress(usdcMint, trader.publicKey);

            const reserveBalance = await connection.getTokenAccountBalance(usdcReserveAta);
            const traderBalance = await connection.getTokenAccountBalance(traderAta);

            console.log("\nCurrent balances:");
            console.log("USDC Reserve:", reserveBalance.value.uiAmount, "USDC");
            console.log("Trader:", traderBalance.value.uiAmount, "USDC");

            if (reserveBalance.value.uiAmount >= 100_000_000 && traderBalance.value.uiAmount >= 10_000) {
                console.log("\nEnvironment already initialized with sufficient balances.");
                // Update initialization status
                initStatus.isInitialized = true;
                initStatus.lastInitTimestamp = Date.now();
                fs.writeFileSync(initStatusPath, JSON.stringify(initStatus, null, 2));
                process.exit(0);
            } else {
                console.log("\nEnvironment exists but needs balance updates.");
            }
        } else {
            console.log("Global config does not exist. Proceeding with initialization...");
        }

        // Create USDC mint if not already created
        let usdcMint: Keypair;
        let mint: PublicKey;
        if (!accountInfo.usdcMint) {
            usdcMint = Keypair.generate();
            console.log("Created USDC mint:", usdcMint.publicKey.toBase58());
            accountInfo.usdcMint = usdcMint.publicKey.toBase58();
            fs.writeFileSync(accountInfoPath, JSON.stringify(accountInfo, null, 2));

            // Create USDC mint account
            mint = await spl.createMint(
                connection,
                admin,
                admin.publicKey,
                null,           
                6,
                usdcMint 
            );
            console.log("Created USDC mint account:", mint);
        } else {
            console.log("Using existing USDC mint:", accountInfo.usdcMint);
            mint = new PublicKey(accountInfo.usdcMint);
        }

        // Create ATAs for USDC reserve and trader if not already created
        let usdcReserveAta: PublicKey;
        if (!accountInfo.usdcReserveAta) {
            usdcReserveAta = await spl.getAssociatedTokenAddress(
                mint,
                usdcReserve.publicKey,
                false,
                spl.TOKEN_PROGRAM_ID,
                spl.ASSOCIATED_TOKEN_PROGRAM_ID
            );

            try {
                const ataInfo = await connection.getAccountInfo(usdcReserveAta);
                if (!ataInfo) {
                    console.log(`Creating new ATA for ${usdcReserve.publicKey.toBase58()}`);
                    await spl.createAssociatedTokenAccount(
                        connection,
                        admin,
                        mint,
                        usdcReserve.publicKey,
                        { commitment: "confirmed" }
                    );
                }
            } catch (error) {
                console.error(`Error creating ATA: ${error}`);
                throw error;
            }
            console.log("Created USDC Reserve ATA:", usdcReserveAta.toBase58());
            accountInfo.usdcReserveAta = usdcReserveAta.toBase58();
            fs.writeFileSync(accountInfoPath, JSON.stringify(accountInfo, null, 2));
        } else {
            console.log("Using existing USDC Reserve ATA:", accountInfo.usdcReserveAta);
            usdcReserveAta = new PublicKey(accountInfo.usdcReserveAta);
        }

        let traderAta: PublicKey;
        if (!accountInfo.traderAta) {
            traderAta = await spl.getAssociatedTokenAddress(
                mint,
                trader.publicKey,
                false,
                spl.TOKEN_PROGRAM_ID,
                spl.ASSOCIATED_TOKEN_PROGRAM_ID
            );

            try {
                const ataInfo = await connection.getAccountInfo(traderAta);
                if (!ataInfo) {
                    console.log(`Creating new ATA for ${trader.publicKey.toBase58()}`);
                    await spl.createAssociatedTokenAccount(
                        connection,
                        admin,
                        mint,
                        trader.publicKey,
                        { commitment: "confirmed" }
                    );
                }
            } catch (error) {
                console.error(`Error creating ATA: ${error}`);
                throw error;
            }
            console.log("Created Trader ATA:", traderAta.toBase58());
            accountInfo.traderAta = traderAta.toBase58();
            fs.writeFileSync(accountInfoPath, JSON.stringify(accountInfo, null, 2));
        } else {
            console.log("Using existing Trader ATA:", accountInfo.traderAta);
            traderAta = new PublicKey(accountInfo.traderAta);
        }

        

        // Mint USDC to reserve if not already done
        if (!accountInfo.lastMintToReserve) {
            const mintToReserveTx = await spl.mintTo(
                connection,
                admin,
                mint,
                usdcReserveAta,
                admin,
                100_000_000_000_000 // 100 million USDC with 6 decimals
            );
            console.log("Minted USDC to reserve:", mintToReserveTx);
            accountInfo.lastMintToReserve = mintToReserveTx;
            fs.writeFileSync(accountInfoPath, JSON.stringify(accountInfo, null, 2));
        } else {
            console.log("USDC already minted to reserve");
        }

        // Transfer USDC to trader if not already done
        if (!accountInfo.lastTransferToTrader) {
            const transferToTraderTx = await spl.transfer(
                connection,
                admin,
                usdcReserveAta,
                traderAta,
                usdcReserve,
                10_000_000_000 // 10K USDC with 6 decimals
            );
            console.log("Transferred USDC to trader:", transferToTraderTx);
            accountInfo.lastTransferToTrader = transferToTraderTx;
            fs.writeFileSync(accountInfoPath, JSON.stringify(accountInfo, null, 2));
        } else {
            console.log("USDC already transferred to trader");
        }

        // Initialize Arbor program if not already done
        if (!initStatus.isInitialized) {
            const initTx = await client.initializeConfig(
                100, // 1% fee (500 basis points)
                admin.publicKey,
                mint
            );
            console.log("Initialized Arbor program:", initTx);

            // Update initialization status
            initStatus.isInitialized = true;
            initStatus.lastInitTimestamp = Date.now();
            fs.writeFileSync(initStatusPath, JSON.stringify(initStatus, null, 2));
        } else {
            console.log("Arbor program already initialized");
        }

        console.log("\nSetup completed successfully!");
        console.log("Account information saved to:", accountInfoPath);
        console.log("Initialization status saved to:", initStatusPath);

    } catch (error) {
        console.error("Error during setup:", error);
        console.log("Last saved state can be found in:", accountInfoPath);
        process.exit(1);
    }
}

main().then(
    () => process.exit(0),
    (err) => {
        console.error(err);
        process.exit(1);
    }
); 