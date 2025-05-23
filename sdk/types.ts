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

export type TransferYieldToProtocolVaultsInput = {
    seed: number,
    signer: Keypair,
    jupiterAmount: number,
    driftAmount: number,
}

export type WithdrawFromTreasuryInput = {
    amount: number,
    admin: Keypair,
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
    signer: Keypair,
}

export type ClaimYieldInput = {
    seed: number,
    driftYield: number,
    jupiterYield: number,
    signer: Keypair,
}

export type TopUpOrderInput = {
    seed: number,
    driftAmount: number,
    jupiterAmount: number,
    treasuryVault: PublicKey,
    signer: Keypair,
    order?: PublicKey,
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
    bump: number;
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

export type OpenOrder = {
    order: PublicKey,
    driftVault: PublicKey,
    jupiterVault: PublicKey,
    driftBump: number,
    jupiterBump: number,
}