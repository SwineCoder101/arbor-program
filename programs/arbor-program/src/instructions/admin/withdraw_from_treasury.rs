

use anchor_lang::prelude::*;

use anchor_spl::{associated_token::*, token::{Token}, token_interface::{transfer_checked, Mint, TokenAccount, TransferChecked}};

use crate::{error::ArborError, state::GlobalConfig};

#[derive(Accounts)]
pub struct WithdrawFromTreasury<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,


    #[account(seeds = [b"config"], bump = global_config.bump, has_one = usdc_mint, has_one = admin)]
    pub global_config: Account<'info, GlobalConfig>,


    ///CHECK: This is safe. It's just used to sign things
    #[account(mut, seeds = [b"auth"], bump = global_config.auth_bump)]
    pub program_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        token::token_program = token_program,
        token::mint = usdc_mint,
        token::authority = admin
    )]
    pub admin_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(mut,
        associated_token::token_program = token_program,
        associated_token::mint = usdc_mint,
        associated_token::authority = program_authority)]
    pub treasury_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(mint::token_program = token_program)]
    pub usdc_mint: InterfaceAccount<'info,Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,

}

impl<'info> WithdrawFromTreasury<'info> {
    pub fn withdraw_from_treasury(&mut self, amount: u64) -> Result<()> {

        require!(self.admin.key() == self.global_config.admin, ArborError::UnAuthorizedWithdrawFromTreasury);
        
        let cpi_program = self.token_program.to_account_info();

        let transfer_accounts = TransferChecked {
            from: self.treasury_vault.to_account_info(),
            mint: self.usdc_mint.to_account_info(),
            to: self.admin_ata.to_account_info(),
            authority: self.program_authority.to_account_info()
        };

        let signer_seeds : [&[&[u8]] ;1]= [&[
            b"auth",
            self.program_authority.to_account_info().key.as_ref(),
            &[self.global_config.auth_bump]]
        ];

        let cpi_ctx = CpiContext::new_with_signer(cpi_program, transfer_accounts, &signer_seeds);

        transfer_checked(cpi_ctx, amount, self.usdc_mint.decimals)
    }
}