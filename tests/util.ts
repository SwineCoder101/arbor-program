
import * as anchor from "@coral-xyz/anchor";
import * as spl from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { ArborClient } from "../sdk/arbor-client";
import { OpenOrder } from "../sdk/types";



export async function setupWalletsAndMints(provider: anchor.AnchorProvider) {
    console.log("setting up wallets and mints");
    const admin = await setupAdmin(provider);
    const usdcMint = await setupUSDCMint(provider, admin);

    const mintData = await spl.getMint(provider.connection, usdcMint.publicKey);
    console.log('Mint Info:', {
        address: usdcMint.publicKey.toBase58(),
        decimals: mintData.decimals,
        supply: mintData.supply.toString(),
        mintAuthority: mintData.mintAuthority?.toBase58(),
        freezeAuthority: mintData.freezeAuthority?.toBase58()
    });
    
    const trader = await setupTraderWallet(provider, usdcMint.publicKey, admin);
    const usdcReserve = await setupUSDCReserveWallet(provider, usdcMint.publicKey, admin);

    const ataInfo = await provider.connection.getAccountInfo(trader.ata);
    // console.log('ATA Info:', {
    //     address: trader.ata.toBase58(),
    //     mint: ataInfo ? new PublicKey(ataInfo.data.slice(0, 32)).toBase58() : 'None',
    //     owner: ataInfo ? new PublicKey(ataInfo.data.slice(32, 64)).toBase58() : 'None',
    //     amount: ataInfo ? new anchor.BN(ataInfo.data.slice(64, 72), 'le').toString() : 'None'
    // });
    
    console.log("done setting up wallets and mints");
    return { usdcMint, trader, usdcReserve, admin };
}

export async function setupUserWithSol(provider: anchor.AnchorProvider, amount: number) {
    const admin = anchor.web3.Keypair.generate();
    await fundAccountWithSol(provider, admin.publicKey, amount);
    return admin;
}

export async function setupAdmin(provider: anchor.AnchorProvider) {
    const admin = anchor.web3.Keypair.generate();
    await fundAccountWithSol(provider, admin.publicKey, 2);
    const balance = await provider.connection.getBalance(admin.publicKey);
    console.log(`Admin Wallet: ${admin.publicKey.toBase58()} with balance: ${balance}`)
    return admin;
}

export async function setupTraderWallet(
    provider: anchor.AnchorProvider, 
    usdcMint: PublicKey,
    mintAuthority: anchor.web3.Keypair
) {
    const wallet = anchor.web3.Keypair.generate();
    await fundAccountWithSol(provider, wallet.publicKey, 2);
    const balance = await provider.connection.getBalance(wallet.publicKey);
    console.log(`Trader Wallet: ${wallet.publicKey.toBase58()} with balance: ${balance}`)

    const ata = await fundAccountWithUSDC(provider, wallet, usdcMint, 100_000_000_000, mintAuthority);
    return { wallet, ata };
}


export async function logBalancesUserTreasury(provider: anchor.AnchorProvider, client: ArborClient, trader: {wallet: Keypair, ata: PublicKey}, logMsg: string = "", treasuryVault: PublicKey, shouldLog: boolean = true) {
    const usdcBalanceTrader = await client.getUSDCBalanceOf(provider.connection, trader.wallet.publicKey);
    const usdcBalanceTreasury = await client.getVaultBalance(provider.connection, treasuryVault);

    if (shouldLog) {
        console.log(logMsg);
        console.log("usdcBalanceTrader: ", usdcBalanceTrader);
        console.log("usdcBalanceTreasury: ", usdcBalanceTreasury);
    }

    return {usdcBalanceTrader, usdcBalanceTreasury};
}

export async function logBalancesAfterOrderOpen(provider: anchor.AnchorProvider, client: ArborClient, openOrder: OpenOrder, trader: {wallet: Keypair, ata: PublicKey}, treasuryVault: PublicKey, logMsg: string = "", shouldLog: boolean = true) {
    const usdcBalanceDrift = await client.getVaultBalance(provider.connection, openOrder.driftVault);
    const usdcBalanceJupiter = await client.getVaultBalance(provider.connection, openOrder.jupiterVault);
    const usdcBalanceTreasury = await client.getVaultBalance(provider.connection, treasuryVault);
    const usdcBalanceTrader = await client.getUSDCBalanceOf(provider.connection, trader.wallet.publicKey);

    if (shouldLog) {
        console.log(logMsg);
        console.log("usdcBalanceDrift: ", usdcBalanceDrift);
        console.log("usdcBalanceJupiter: ", usdcBalanceJupiter);
        console.log("usdcBalanceTreasury: ", usdcBalanceTreasury);
        console.log("usdcBalanceTrader: ", usdcBalanceTrader);
    }

    return {usdcBalanceDrift, usdcBalanceJupiter, usdcBalanceTreasury, usdcBalanceTrader};
}

export async function setupUSDCReserveWallet(
    provider: anchor.AnchorProvider, 
    usdcMint: PublicKey,
    mintAuthority: anchor.web3.Keypair
) {
    const wallet = anchor.web3.Keypair.generate();
    await fundAccountWithSol(provider, wallet.publicKey, 2);
    const balance = await provider.connection.getBalance(wallet.publicKey);
    console.log(`Funding USDC Reserve Wallet: ${wallet.publicKey.toBase58()} with balance: ${balance}`)
    const ata = await fundAccountWithUSDC(provider, wallet, usdcMint, 1_000_000_000, mintAuthority);
    return { wallet, ata };
}


export async function fundAccountWithUSDC(
    provider: anchor.AnchorProvider, 
    owner: anchor.web3.Keypair, 
    usdcMint: PublicKey, 
    amount: number = 100_000_000,
    mintAuthority: anchor.web3.Keypair
) {
    const ata = await createATA(usdcMint, owner, provider);
    
    // Verify the ATA was created
    const ataInfo = await provider.connection.getAccountInfo(ata);
    if (!ataInfo) {
        throw new Error(`Failed to create ATA for ${owner.publicKey.toBase58()}`);
    }

    await mintTo(usdcMint, ata, new anchor.BN(amount), provider, mintAuthority);

    const balance = await provider.connection.getTokenAccountBalance(ata);
    console.log(`${owner.publicKey.toBase58()} has ${balance.value.amount} USDC`);
    return ata;
}

export async function setupUSDCMint(provider: anchor.AnchorProvider, signer: Keypair) {
    const usdcMintKeypair = anchor.web3.Keypair.generate();
    
    const mint = await spl.createMint(
        provider.connection,
        signer,
        signer.publicKey,
        null,           
        6,
        usdcMintKeypair 
    );
    
    console.log(`USDC Mint: ${mint.toBase58()}`);
    console.log(`Mint Authority: ${signer.publicKey.toBase58()}`);
    
    return { 
        publicKey: mint,
        keypair: usdcMintKeypair 
    };
}

export async function fundAccountWithSol(provider: anchor.AnchorProvider, pubkey: anchor.web3.PublicKey, amount: number) {
    const lastValidBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
        signature: await provider.connection.requestAirdrop(pubkey, amount * LAMPORTS_PER_SOL),
        blockhash: lastValidBlockhash.blockhash,
        lastValidBlockHeight: lastValidBlockhash.lastValidBlockHeight
    });
  }

  export async function createMint(
    decimals: number,
    provider: anchor.AnchorProvider,
    signer: anchor.web3.Keypair
): Promise<PublicKey> {
    return await spl.createMint(
        provider.connection,
        signer,
        signer.publicKey,  
        null,             
        decimals,
    );
}

export async function createATA(
    mint: anchor.web3.PublicKey, 
    owner: Keypair, 
    provider: anchor.AnchorProvider
) {
    const ata = await spl.getAssociatedTokenAddress(
        mint,
        owner.publicKey,
        false,
        spl.TOKEN_PROGRAM_ID,
        spl.ASSOCIATED_TOKEN_PROGRAM_ID
    );

    try {
        const ataInfo = await provider.connection.getAccountInfo(ata);
        if (!ataInfo) {
            console.log(`Creating new ATA for ${owner.publicKey.toBase58()}`);
            await spl.createAssociatedTokenAccount(
                provider.connection,
                owner,
                mint,
                owner.publicKey,
                { commitment: "confirmed" }
            );
        }
        return ata;
    } catch (error) {
        console.error(`Error creating ATA: ${error}`);
        throw error;
    }
}


export async function getUSDCBalanceOf(provider: anchor.AnchorProvider, pubkey: anchor.web3.PublicKey, usdcMint: anchor.web3.PublicKey) {
    const ata = await spl.getAssociatedTokenAddress(
        usdcMint,
        pubkey,
        true,
        spl.TOKEN_PROGRAM_ID,
        spl.ASSOCIATED_TOKEN_PROGRAM_ID
    );
    console.log("finding balance of ata: ", ata.toBase58(), " for account: ", pubkey.toBase58(), " on mint: ", usdcMint.toBase58());
    const balance = await provider.connection.getTokenAccountBalance(ata);
    return new Number(balance.value.amount);
}


export async function mintTo(
    mint: anchor.web3.PublicKey,
    ata: anchor.web3.PublicKey,
    amount: anchor.BN,
    provider: anchor.AnchorProvider,
    authority: anchor.web3.Keypair
) {
    try {
        console.log(`Minting to ${ata.toBase58()}`);
        console.log(`Using authority ${authority.publicKey.toBase58()}`);
        
        const tx = await spl.mintTo(
            provider.connection,
            authority,
            mint,
            ata,
            authority,
            amount.toNumber(),
            undefined,
            { commitment: "confirmed" }
        );
        
        console.log(`Mint successful: ${tx}`);
        return tx;
    } catch (error) {
        console.error(`Error minting tokens:`, error);
        throw error;
    }
}