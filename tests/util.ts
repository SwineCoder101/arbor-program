
import * as anchor from "@coral-xyz/anchor";
import * as spl from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";



export async function setupWalletsAndMints(provider: anchor.AnchorProvider) {
    console.log("setting up wallets and mints");
    const usdcMint = await setupUSDCMint(provider);
    const trader = await setupTraderWallet(provider, usdcMint.publicKey);
    const usdcReserve = await setupUSDCReserveWallet(provider, usdcMint.publicKey);
    const admin = await setupAdmin(provider, usdcMint.publicKey);
    console.log("done setting up wallets and mints");
    return { usdcMint, trader, usdcReserve, admin };
}

export async function setupUserWithSol(provider: anchor.AnchorProvider, amount: number) {
    const admin = anchor.web3.Keypair.generate();
    await fundAccountWithSol(provider, admin.publicKey, amount);
    return admin;
}

export async function setupAdmin(provider: anchor.AnchorProvider, usdcMint: PublicKey) {
    const admin = anchor.web3.Keypair.generate();
    const ata = await createATA(usdcMint, admin, provider);
    await fundAccountWithSol(provider, admin.publicKey, 2);
    return { wallet: admin, ata };
}

export async function setupTraderWallet(provider: anchor.AnchorProvider, usdcMint: PublicKey) {
    const wallet = anchor.web3.Keypair.generate();
    await fundAccountWithSol(provider, wallet.publicKey, 2);
    const ata = await fundAccountWithUSDC(provider, wallet, usdcMint, 100_000_000);
    return { wallet, ata };
}

export async function setupUSDCReserveWallet(provider: anchor.AnchorProvider, usdcMint: PublicKey) {
    const wallet = anchor.web3.Keypair.generate();
    await fundAccountWithSol(provider, wallet.publicKey, 2);
    const ata = await fundAccountWithUSDC(provider, wallet, usdcMint, 1_000_000_000_000_000_000);
    return { wallet, ata };
}

export async function fundAccountWithUSDC(provider: anchor.AnchorProvider, owner: anchor.web3.Keypair, usdcMint: PublicKey, amount: number) {
    const ata = await createATA(usdcMint, owner, provider);
    await mintTo(usdcMint, ata, new anchor.BN(amount), provider, owner);

    const balance = await provider.connection.getTokenAccountBalance(ata);
    console.log(`${owner.publicKey.toBase58()} has ${balance.value.amount} USDC`);
    return ata;
}

export async function setupUSDCMint(provider: anchor.AnchorProvider) {
    const usdcMint = anchor.web3.Keypair.generate();
    await createMint(6, provider, usdcMint);
    return usdcMint;
}

export async function fundAccountWithSol(provider: anchor.AnchorProvider, pubkey: anchor.web3.PublicKey, amount: number) {
    const lastValidBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
        signature: await provider.connection.requestAirdrop(pubkey, amount * LAMPORTS_PER_SOL),
        blockhash: lastValidBlockhash.blockhash,
        lastValidBlockHeight: lastValidBlockhash.lastValidBlockHeight
    });
    const balance = await provider.connection.getBalance(pubkey);
    console.log(`${pubkey.toBase58()} has ${balance} SOL`);
  }

  export async function createMint(decimals: number, provider: anchor.AnchorProvider, signer: anchor.web3.Keypair): Promise<PublicKey> {
    return await spl.createMint(
      provider.connection,
      provider.wallet,
      provider.wallet.publicKey,
      null,
      decimals
    );
  }

  export async function createATA(mint: anchor.web3.PublicKey, owner: Keypair, provider: anchor.AnchorProvider) {
    const ata = await spl.getAssociatedTokenAddress(
      mint,
      owner.publicKey,
      false,
      spl.TOKEN_PROGRAM_ID
    );
    await spl.createAssociatedTokenAccount(
      provider.connection,
      owner,
      mint,
      owner.publicKey
    );
    return ata;
  }

  export async function mintTo(mint: anchor.web3.PublicKey, ata: anchor.web3.PublicKey,  amount: anchor.BN, provider: anchor.AnchorProvider, signer: anchor.web3.Keypair) {
    await spl.mintTo(
      provider.connection,
      signer,
      mint,
      ata,
      signer.publicKey,
      amount.toNumber()
    );
  }