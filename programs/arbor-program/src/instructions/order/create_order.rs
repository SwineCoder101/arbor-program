use anchor_lang::prelude::*;

use anchor_spl::{associated_token::*, token_interface::{TokenAccount,Mint,TokenInterface,TransferChecked, transfer_checked}};

use crate::state::Order;

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct CreateOrder<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = Order::INIT_SPACE,
        seeds = [b"order", owner.key().as_ref(), &seed.to_le_bytes()],
        bump
    )]
    pub order: Account<'info, Order>,

    // pub associated_token_program: Program<'info, AssociatedToken>,

    // #[account(mint::token_program = token_program)]
    // pub token_program: Interface<'info,TokenInterface>,

    pub system_program:Program<'info,System>,
}

impl<'info> CreateOrder<'info> {

    pub fn create_order(&mut self) -> Result<()> {
        todo!();
    }
}