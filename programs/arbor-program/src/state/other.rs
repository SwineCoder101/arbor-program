use anchor_lang::prelude::*;

#[account]
#[derive(Debug,InitSpace)]
pub struct GlobalConfig {
    pub fee_bps: u64,
    pub admin: Pubkey,
    pub usdc_mint: Pubkey,
    pub bump:  u8,
}

#[account]
#[derive(InitSpace)]
pub struct ProgramAuthority {
    pub bump: u8,
}