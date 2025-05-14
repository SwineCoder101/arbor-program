use anchor_lang::prelude::*;

use anchor_spl::{associated_token::*, token::{Token}, token_interface::{transfer_checked, Mint, TokenAccount, TransferChecked, close_account, CloseAccount}};
use crate::{error::ArborError, state::{Order, GlobalConfig}};

#[derive(Accounts)]
pub struct CloseOrder<'info> {


    // owner of the order is the taker
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        token::token_program = token_program,
        token::mint = global_config.usdc_mint,
        token::authority = owner
    )]
    pub owner_ata: InterfaceAccount<'info,TokenAccount>,

    #[account(mint::token_program = token_program)]
    pub usdc_mint: InterfaceAccount<'info,Mint>,

    #[account(
        mut,
        close = owner,
        seeds = [b"order", order.owner.key().as_ref(), &order.seed.to_le_bytes()],
        bump = order.bump
    )]
    pub order: Account<'info, Order>,

    #[account(seeds = [b"config"], bump = global_config.bump, has_one = usdc_mint)]
    pub global_config: Account<'info, GlobalConfig>,


    ///CHECK: This is safe. It's just used to sign things
    #[account(seeds = [b"auth"], bump = global_config.auth_bump)]
    pub program_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"vault-jup", order.key().as_ref()],
        bump = order.jup_vault_bump,
        token::mint = usdc_mint,
        token::authority = program_authority,
        token::token_program = token_program,
    )]
    pub jupiter_vault: InterfaceAccount<'info, TokenAccount>,


    #[account(
        mut,
        seeds = [b"vault-drift", order.key().as_ref()],
        bump = order.drift_vault_bump,
        token::mint = usdc_mint,
        token::authority = program_authority,
        token::token_program = token_program,
    )]
    pub drift_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(mut,
        associated_token::token_program = token_program,
        associated_token::mint = usdc_mint,
        associated_token::authority = program_authority)]
    pub treasury_vault: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

impl<'info> CloseOrder<'info> {

    pub fn close_order(&mut self) -> Result<()> {

        //check owner of the order
        require_eq!(self.order.owner, self.owner.key(), ArborError::UnAuthorizedCloseOrder);

        // charge a fee and transfer to treasury

        let fee_amount_drift = self.global_config.fee_bps * self.order.drift_perp_amount / 10000;
        let fee_amount_jupiter = self.global_config.fee_bps * self.order.drift_perp_amount / 10000;

        let drift_remaining = self.order.drift_perp_amount - fee_amount_drift;
        let jupiter_remaining = self.order.jup_perp_amount - fee_amount_jupiter;

        self.charge_fee_to_treasury(self.drift_vault.to_account_info(), fee_amount_drift)?;
        self.charge_fee_to_treasury(self.jupiter_vault.to_account_info(), fee_amount_jupiter)?;

        // transfer remaining to user
        self.transfer_to_user(self.drift_vault.clone(), drift_remaining)?;
        self.transfer_to_user(self.jupiter_vault.clone(), jupiter_remaining)?;

        // close accounts
        self.close_vault_account(self.jupiter_vault.to_account_info())?;
        self.close_vault_account(self.drift_vault.to_account_info())?;

        Ok(())
    }

    fn close_vault_account(&mut self, protocol_vault: AccountInfo<'info>) -> Result<()> {
        let cpi_program: AccountInfo<'_> = self.token_program.to_account_info();

        let close_accounts = CloseAccount {
            account: protocol_vault,
            destination: self.order.to_account_info(),
            authority: self.program_authority.to_account_info()
        };

        let signer_seeds: &[&[&[u8]]] = &[&[b"auth", &[self.global_config.auth_bump]]];


        let cpi_ctx = CpiContext::new_with_signer(cpi_program, close_accounts, &signer_seeds);

        close_account(cpi_ctx)
    }

    fn charge_fee_to_treasury(&mut self, protocol_vault: AccountInfo<'info>, fee_amount: u64) -> Result<()> {

        let transfer_cpi_program = self.token_program.to_account_info();

        let transfer_accounts = TransferChecked {
            from: protocol_vault,
            mint: self.usdc_mint.to_account_info(),
            to: self.treasury_vault.to_account_info(),
            authority: self.program_authority.to_account_info()
        };

        let signer_seeds: &[&[&[u8]]] = &[&[b"auth", &[self.global_config.auth_bump]]];


        let cpi_ctx = CpiContext::new_with_signer(transfer_cpi_program.clone(), 
        transfer_accounts, &signer_seeds);
        
        transfer_checked(cpi_ctx, fee_amount, self.usdc_mint.decimals)
    }

    fn transfer_to_user(&mut self, protocol_vault: InterfaceAccount<'info, TokenAccount>, amount: u64 ) -> Result<()> {
        let transfer_cpi_program = self.token_program.to_account_info();

        let transfer_accounts = TransferChecked {
            from: protocol_vault.to_account_info(),
            mint: self.usdc_mint.to_account_info(),
            to: self.owner_ata.to_account_info(),
            authority: self.program_authority.to_account_info()
        };

        let signer_seeds: &[&[&[u8]]] = &[&[b"auth", &[self.global_config.auth_bump]]];

        let cpi_ctx = CpiContext::new_with_signer(transfer_cpi_program.clone(), transfer_accounts, &signer_seeds);
        
        transfer_checked(cpi_ctx, amount, self.usdc_mint.decimals)
    }
}