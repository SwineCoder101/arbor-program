use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct CloseOrder<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub order: Account<'info, Order>,
}

impl<'info> CloseOrder<'info> {

    pub fn close_order(&mut self) -> Result<()> {
        todo!();
    }
}