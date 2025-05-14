pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("82kzsHhGThuVdNvUm6eCchTL9CYTp6s7bufFZ3ARBtYH");

#[program]
pub mod arbor_program {
    use super::*;

    pub fn top_up_order(ctx: Context<TopUpOrder>, drift_amount: u64, jupiter_amount: u64) -> Result<()> {
        ctx.accounts.top_up_order(drift_amount, jupiter_amount)
    }

    pub fn claim_yield(ctx: Context<ClaimYield>, drift_yield: u64, jupiter_yield: u64) -> Result<()> {
        ctx.accounts.claim_yield(drift_yield, jupiter_yield)
    }

    pub fn close_order(ctx: Context<CloseOrder>) -> Result<()> {
        ctx.accounts.close_order()
    }

    pub fn withdraw_from_treasury(ctx: Context<WithdrawFromTreasury>, amount: u64) -> Result<()> {
        ctx.accounts.withdraw_from_treasury(amount)
    }

    pub fn initialize_config(ctx: Context<InitializeConfig>, fee_bps: u64, admin: Pubkey, usdc_mint: Pubkey) -> Result<()> {
        ctx.accounts.initialize_config(ctx.bumps.global_config, ctx.bumps.program_authority, fee_bps, admin, usdc_mint)
    }

    // pub fn keeper_withdraw_yield(ctx: Context<KeeperWithdrawYield>, amount: u64) -> Result<()> {
    //     ctx.accounts.keeper_withdraw_yield(amount)
    // }

    pub fn create_order(
        ctx: Context<CreateOrder>,
        seed: u64,
        jup_perp_amount: u64,
        drift_perp_amount: u64,
        ratio_bps: u64,
        drift_perp_idx: u64,
        jup_perp_idx: u64,
        drift_side: u8,
        jup_side: u8,
    ) -> Result<()> {

        ctx.accounts.create_order(
            seed,
            &ctx.bumps,
            jup_perp_amount,
            drift_perp_amount,
            ratio_bps,
            drift_perp_idx,
            jup_perp_idx,
            drift_side,
            jup_side,
        )
    }
}
