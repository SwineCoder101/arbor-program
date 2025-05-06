use anchor_lang::prelude::*;
#[account]
#[derive(InitSpace)]
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


    /* solend loan refs */
    // pub reserve_address: Pubkey,
    // pub liquidity_address: Pubkey,
    // pub ctoken_mint: Pubkey,
    // pub collateral_amount: u64,
    // pub underlying_collateral_mint: Pubkey,

    /* bookkeeyping */
    pub last_price_pv: u64,
    pub last_arbitrage_rate: u64,

}