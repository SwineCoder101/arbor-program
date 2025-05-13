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

    pub fn claim_yield(ctx: Context<ClaimYield>) -> Result<()> {
        ctx.accounts.claim_yield()
    }

    pub fn close_order(ctx: Context<CloseOrder>, seed: u64) -> Result<()> {
        ctx.accounts.close_order(seed)
    }

    pub fn withdraw_from_treasury(ctx: Context<WithdrawFromTreasury>, amount: u64) -> Result<()> {
        ctx.accounts.withdraw_from_treasury(amount)
    }

    pub fn initialize_config(ctx: Context<InitializeConfig>, fee_bps: u64, admin: Pubkey, usdc_mint: Pubkey, bump: u8, program_authority_bump: u8) -> Result<()> {
        ctx.accounts.initialize_config(fee_bps, admin, usdc_mint, bump, program_authority_bump)
    }

    // pub fn keeper_withdraw_yield(ctx: Context<KeeperWithdrawYield>, amount: u64) -> Result<()> {
    //     ctx.accounts.keeper_withdraw_yield(amount)
    // }

    pub fn create_order(
        ctx: Context<CreateOrder>,
        seed: u64,
        bumps_in: u8,
        jup_perp_amount: u64,
        drift_perp_amount: u64,
        ratio_bps: u64,
        drift_perp_idx: u64,
        jup_perp_idx: u64,
        drift_side: u8,
        jup_side: u8,
    ) -> Result<()> {

        let bumps: CreateOrderBumps = CreateOrderBumps {
            order: bumps_in,
            program_authority: bumps_in,
            jupiter_vault: bumps_in,
            drift_vault: bumps_in,
        };


        ctx.accounts.create_order(
            seed,
            &bumps,
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
