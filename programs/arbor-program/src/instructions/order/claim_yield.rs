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


    #[account(
        mut,
        seeds = [b"vault", b"jupit", order.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = program_authority,
        token::token_program = token_program,
    )]
    pub jupiter_vault: InterfaceAccount<'info, TokenAccount>,


    #[account(
        mut,
        seeds = [b"vault", b"drift", order.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = program_authority,
        token::token_program = token_program,
    )]
    pub drift_vault: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> ClaimYield<'info> {

    pub fn claim_yield(&mut self, drift_yield: u64, jupiter_yield: u64) -> Result<()> {
        self.transfer_to_user(drift_yield, self.drift_vault.to_account_info())?;
        self.transfer_to_user(jupiter_yield, self.jupiter_vault.to_account_info())?;

        Ok(())
    }

    pub fn transfer_to_user(&mut self, amount: u64, protocol_vault: AccountInfo<'info>) -> Result<()> {
        let cpi_program = self.token_program.to_account_info();

        let transfer_accounts = TransferChecked {
            from: protocol_vault,
            mint: self.usdc_mint.to_account_info(),
            to: self.owner_ata.to_account_info(),
            authority: self.program_authority.to_account_info()
        };

        let signer_seeds : [&[&[u8]] ;1]= [&[
            b"auth",
            self.program_authority.to_account_info().key.as_ref(),
            &[self.program_authority.bump]]
        ];

        let cpi_ctx = CpiContext::new_with_signer(cpi_program, transfer_accounts, &signer_seeds);

        transfer_checked(cpi_ctx, amount, self.usdc_mint.decimals)
    }
}