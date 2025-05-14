use anchor_lang::prelude::*;
use anchor_spl::{
    token_interface::{Mint, TokenAccount},
    token::{Token},
};

use crate::GlobalConfig;

#[derive(Accounts)]
#[instruction(order: Pubkey)]
pub struct CreateProtocolVaults<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account()]
    pub usdc_mint: Box<InterfaceAccount<'info, Mint>>,

    /// CHECK: This is safe
    #[account(
        seeds = [b"auth"],
        bump = global_config.auth_bump
    )]
    pub program_authority: UncheckedAccount<'info>,

    #[account(seeds = [b"config"], bump = global_config.bump)]
    pub global_config: Box<Account<'info, GlobalConfig>>,

    #[account(
        init,
        payer = owner,
        seeds = [b"vault-jup", order.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = program_authority,
        token::token_program = token_program,
    )]
    pub jupiter_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init,
        payer = owner,
        seeds = [b"vault-drift", order.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = program_authority,
        token::token_program = token_program,
    )]
    pub drift_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

impl<'info> CreateProtocolVaults<'info> {
    pub fn create_protocol_vaults(&mut self, bumps: &CreateProtocolVaultsBumps, order: Pubkey) -> Result<()> {
        Ok(())
    }
}