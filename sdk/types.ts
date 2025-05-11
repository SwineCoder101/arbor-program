import { BN } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";

export type OrderAccount = {
    bump: BN;
    seed: BN;
    owner: PublicKey;
    isOpen: boolean;
    ratioBps: BN;
    driftPerpIdx: BN;
    jupiterPerpIdx: BN;
    driftPerpAmount: BN;
    jupiterPerpAmount: BN;
    driftSide: BN;
    jupiterSide: BN;
    lastPricePv: BN;
    lastArbitrageRate: BN;
}

export type CreateOrderInput = {
    signer: Keypair,
    seed: number,
    jupPerpAmount: number,
    driftPerpAmount: number,
    ratioBps: number,
    driftPerpIdx: number,
    jupPerpIdx: number,
    driftSide: number,
    jupSide: number
}

export type CloseOrderInput = {
    seed: number,
    treasuryVault: PublicKey,
}

export type ClaimYieldInput = {
    seed: number,
}

export type TopUpOrderInput = {
    seed: number,
    amount: number,
    treasuryVault: PublicKey,
}

export type OrderAccountData = {
    bump: number,
    seed: number,
    owner: string,
    isOpen: boolean,
    ratioBps: number,
    driftPerpIdx: number,
    jupiterPerpIdx: number,
    driftPerpAmount: number,
    jupiterPerpAmount: number,
    driftSide: number,
    jupiterSide: number,
    lastPricePv: number,
    lastArbitrageRate: number,
}

export type GlobalConfigAccount = {
    usdcMint: PublicKey;
    feeBps: BN;
    admin: PublicKey;
    bump: BN;
}

export type GlobalConfigAccountData = {
    usdcMint: string,
    feeBps: number,
    admin: string,
    bump: number,
}

export type ProgramAuthorityAccount = {
    bump: BN;
}

export type ProgramAuthorityAccountData = {
    bump: number,
}