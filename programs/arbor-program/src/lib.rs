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
        ctx.accounts.top_up_order(amount)
    }

    pub fn claim_yield(ctx: Context<ClaimYield>) -> Result<()> {
        ctx.accounts.claim_yield()
    }

    pub fn close_order(ctx: Context<CloseOrder>) -> Result<()> {
        ctx.accounts.close_order()
    }

    pub fn create_order(ctx: Context<CreateOrder>, amount: u64) -> Result<()> {
        ctx.accounts.create_order(amount)
    }
}
