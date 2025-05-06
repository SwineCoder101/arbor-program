use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use crate::state::{Order, other::ProgramAuthority};

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct CloseOrder<'info> {

    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut, has_one = owner, close = owner)]
    pub order: Account<'info, Order>,

    #[account(seeds = [b"auth"], bump)]
    pub program_authority: Account<'info, ProgramAuthority>,

    #[account(mut)]
    pub treasury_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

impl<'info> CloseOrder<'info> {

    pub fn close_order(&mut self) -> Result<()> {
        todo!();
    }
}