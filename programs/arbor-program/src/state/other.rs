use anchor_lang::prelude::*;

#[account(seeds = [b"config"], bump)]
#[derive(InitSpace)]
pub struct GlobalConfig {
    pub fee_bps: u64,
    pub admin: Pubkey,
    pub usdc_mint: Pubkey,
    pub bump:  u8,
}
#[account(seeds = [b"auth"], bump)]
#[derive(InitSpace)]

pub struct ProgramAuthority {}