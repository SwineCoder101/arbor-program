use anchor_lang::prelude::*;

use crate::state::Order;
#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct TopUpOrder<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub order: Account<'info, Order>,
}

impl<'info> TopUpOrder<'info> {

    pub fn top_up_order(&mut self, amount: u64) -> Result<()> {
        todo!();
    }
}