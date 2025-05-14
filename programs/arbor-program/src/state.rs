use anchor_lang::prelude::*;
#[account]
#[derive(Debug,InitSpace)]
pub struct Order {
    
    /* meta */
    pub bump: u8,
    pub seed: u64,
    pub owner: Pubkey,
    pub is_open: bool,

    /* hedge params */
    pub ratio_bps: u64, // long / short
    pub drift_perp_idx: u64,
    pub jup_perp_idx: u64,

    pub drift_perp_amount: u64,
    pub jup_perp_amount: u64,

    // 0 long, 1 short
    pub drift_side: u8,
    pub jup_side: u8,

    pub drift_vault_bump: u8,
    pub jup_vault_bump: u8,

    /* bookkeeyping */
    pub last_price_pv: u64,
    pub last_arbitrage_rate: u64,

}


#[account]
#[derive(Debug,InitSpace)]
pub struct GlobalConfig {
    pub fee_bps: u64,
    pub admin: Pubkey,
    pub usdc_mint: Pubkey,
    pub bump:  u8,
    pub auth_bump: u8,
}