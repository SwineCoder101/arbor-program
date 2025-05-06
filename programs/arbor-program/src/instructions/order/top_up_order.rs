use anchor_lang::prelude::*;
use anchor_spl::token::Token;

use crate::{state::Order, ProgramAuthority};
#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct TopUpOrder<'info> {

    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut, has_one = owner)]
    pub order: Account<'info, Order>,

    #[account(seeds = [b"auth"], bump)]
    pub program_authority: Account<'info, ProgramAuthority>,

    pub token_program: Program<'info, Token>,
}

impl<'info> TopUpOrder<'info> {

    pub fn top_up_order(&mut self, amount: u64, is_long: bool) -> Result<()> {
        todo!();
    }
}