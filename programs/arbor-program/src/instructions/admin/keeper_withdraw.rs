use anchor_lang::prelude::*;

use anchor_spl::{token::{Token}, token_interface::{transfer_checked, Mint, TokenAccount, TransferChecked}};
use crate::{error::ArborError, state::{GlobalConfig}};



#[derive(Accounts)]
pub struct KeeperWithdraw<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut)]
    pub usdc_mint: InterfaceAccount<'info, Mint>,

    #[account(seeds = [b"config"], bump = global_config.bump, has_one = usdc_mint)]
    pub global_config: Account<'info, GlobalConfig>,

    ///CHECK: This is safe. It's just used to sign things
    #[account(seeds = [b"auth"], bump = global_config.auth_bump)]
    pub program_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub jupiter_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub drift_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub treasury_vault: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

impl<'info> KeeperWithdraw<'info> {

    pub fn keeper_withdraw(&mut self, drift_amount: u64, jupiter_amount: u64) -> Result<()> {

        require!(self.admin.key() == self.global_config.admin, ArborError::UnAuthorizedKeeperWithdraw);

        self.transfer_to_treasury(drift_amount, self.drift_vault.to_account_info())?;
        self.transfer_to_treasury(jupiter_amount, self.jupiter_vault.to_account_info())?;
        Ok(())
    }

    pub fn transfer_to_treasury(&mut self, amount: u64, protocol_vault: AccountInfo<'info>) -> Result<()> {
        let cpi_program = self.token_program.to_account_info();

        let transfer_accounts = TransferChecked {
            from: protocol_vault.to_account_info(),
            mint: self.usdc_mint.to_account_info(),
            to: self.treasury_vault.to_account_info(),
            authority: self.program_authority.to_account_info()
        };

        let seeds = &[
            &b"auth"[..],
            &[self.global_config.auth_bump],
        ];

        let signer_seeds = &[&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(cpi_program, transfer_accounts, signer_seeds);

        transfer_checked(cpi_ctx, amount, self.usdc_mint.decimals)
    }
}