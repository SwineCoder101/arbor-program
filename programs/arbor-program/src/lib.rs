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

    pub fn top_up_order(ctx: Context<TopUpOrder>, amount: u64) -> Result<()> {
        ctx.accounts.top_up_order(amount, false)
    }

    pub fn claim_yield(ctx: Context<ClaimYield>) -> Result<()> {
        ctx.accounts.claim_yield()
    }

    pub fn close_order(ctx: Context<CloseOrder>) -> Result<()> {
        ctx.accounts.close_order()
    }

    pub fn withdraw_from_treasury(ctx: Context<WithdrawFromTreasury>, amount: u64) -> Result<()> {
        ctx.accounts.withdraw_from_treasury(amount)
    }

    pub fn create_order(
        ctx: Context<CreateOrder>,
        seed: u64,
        bumps_in: u8,
        amount: u64,
        ratio_bps: u64,
        drift_perp_idx: u64,
        jup_perp_idx: u64,
        drift_side: u8,
        jup_side: u8,
    ) -> Result<()> {

        let bumps: CreateOrderBumps = CreateOrderBumps {
            order: bumps_in,
            program_authority: bumps_in
        };


        ctx.accounts.create_order(
            seed,
            &bumps,
            amount,
            ratio_bps,
            drift_perp_idx,
            jup_perp_idx,
            drift_side,
            jup_side,
        )
    }
}
