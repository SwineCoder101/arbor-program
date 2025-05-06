use anchor_lang::prelude::*;

use anchor_spl::{associated_token::*, token::{Token}, token_interface::{transfer_checked, Mint, TokenAccount, TransferChecked, close_account, CloseAccount}};

use crate::{error::ArborError, other::{GlobalConfig, ProgramAuthority}, state::Order};
#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct TopUpOrder<'info> {

    // owner of the order is the taker
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
        mut,
        close = owner,
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

    #[account(mut)]
    pub treasury_vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> TopUpOrder<'info> {

    pub fn top_up_order(&mut self, amount: u64, is_long: bool) -> Result<()> {

        require_eq!(self.order.owner, self.owner.key(), ArborError::UnAuthorizedTopUpOrder);
        
        if is_long && self.order.drift_side == 0 {
            self.transfer_to_vault(amount, self.drift_vault.to_account_info())?;
        } else if !is_long && self.order.drift_side == 1 {
            self.transfer_to_vault(amount, self.jupiter_vault.to_account_info())?;
        } else {
            return Err(ArborError::InvalidSide.into());
        }
        
        Ok(())
    }

    fn transfer_to_vault(&mut self, amount : u64, protocol_vault: AccountInfo<'info> ) -> Result<()> {
        let transfer_cpi_program = self.token_program.to_account_info();
        
        let transfer_accounts = TransferChecked {
            from: self.owner_ata.to_account_info(),
            mint: self.usdc_mint.to_account_info(),
            to: protocol_vault,
            authority: self.program_authority.to_account_info()
        };

        let cpi_ctx = CpiContext::new(transfer_cpi_program, transfer_accounts);

        transfer_checked(cpi_ctx, amount, self.usdc_mint.decimals)
    }
}