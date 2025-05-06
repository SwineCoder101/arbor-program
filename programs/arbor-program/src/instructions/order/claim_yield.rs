use anchor_lang::prelude::*;

use anchor_spl::{associated_token::*, token::{Token}, token_interface::{transfer_checked, Mint, TokenAccount, TransferChecked}};

use crate::{state::Order, other::{GlobalConfig, ProgramAuthority}};

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct ClaimYield<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        associated_token::token_program = token_program,
        associated_token::mint = global_config.usdc_mint,
        associated_token::authority = program_authority
    )]
    pub owner_ata: InterfaceAccount<'info,TokenAccount>,

    #[account(mint::token_program = token_program)]
    pub usdc_mint: InterfaceAccount<'info,Mint>,

    #[account(
        init,
        payer = owner,
        space = Order::INIT_SPACE,
        seeds = [b"order", owner.key().as_ref(), &seed.to_le_bytes()],
        bump
    )]
    pub order: Account<'info, Order>,

    #[account(mut, seeds = [b"config"], bump = global_config.bump)]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(seeds = [b"auth"], bump)]
    pub program_authority: Account<'info, ProgramAuthority>,


    #[account(mut, 
        associated_token::token_program = token_program,
        associated_token::mint = global_config.usdc_mint,
        associated_token::authority = program_authority
    )]
    pub jupiter_vault: InterfaceAccount<'info, TokenAccount>,


    #[account(mut, 
        associated_token::token_program = token_program,
        associated_token::mint = global_config.usdc_mint,
        associated_token::authority = program_authority
    )]
    pub drift_vault: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> ClaimYield<'info> {

    pub fn claim_yield(&mut self) -> Result<()> {
        todo!();
    }

    pub fn transfer_to_user(&mut self) -> Result<()> {
        todo!();
    }
}