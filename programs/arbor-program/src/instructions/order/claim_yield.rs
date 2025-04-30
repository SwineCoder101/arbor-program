use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct ClaimYield<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub order: Account<'info, Order>,
}

impl<'info> ClaimYield<'info> {

    pub fn claim_yield(&mut self) -> Result<()> {
        todo!();
    }
}