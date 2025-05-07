use anchor_lang::prelude::*;

use anchor_spl::{associated_token::*, token::{Token}, token_interface::{transfer_checked, Mint, TokenAccount, TransferChecked, close_account, CloseAccount}};

use crate::{error::ArborError, other::{GlobalConfig, ProgramAuthority}, state::Order};

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct CloseOrder<'info> {


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


    #[account(
        mut,
        close = owner,
        seeds = [b"vault", b"jupit", order.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = program_authority,
        token::token_program = token_program,
    )]
    pub jupiter_vault: Account<'info, TokenAccount>,


    #[account(
        mut,
        close = owner,
        seeds = [b"vault", b"drift", order.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = program_authority,
        token::token_program = token_program,
    )]
    pub drift_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub treasury_vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> CloseOrder<'info> {

    pub fn close_order(&mut self) -> Result<()> {

        //check owner of the order
        require_eq!(self.order.owner, self.owner.key(), ArborError::UnAuthorizedCloseOrder);

        // charge a fee and transfer to treasury
        self.charge_fee_to_treasury(self.drift_vault.to_account_info())?;
        self.charge_fee_to_treasury(self.jupiter_vault.to_account_info())?;

        // transfer remaining to user
        self.transfer_to_user(self.order.drift_perp_amount, self.drift_vault.to_account_info())?;
        self.transfer_to_user(self.order.jup_perp_amount, self.jupiter_vault.to_account_info())?;

        // close accounts
        self.close_order_account()?;
        self.close_vault_account(self.jupiter_vault.to_account_info())?;
        self.close_vault_account(self.drift_vault.to_account_info())?;

        Ok(())
    }

    fn close_vault_account(&mut self, protocol_vault: AccountInfo<'info>) -> Result<()> {
        let cpi_program: AccountInfo<'_> = self.system_program.to_account_info();

        let close_accounts = CloseAccount {
            account: self.order.to_account_info(),
            destination: protocol_vault,
            authority: self.program_authority.to_account_info()
        };

        let signer_seeds : [&[&[u8]] ;1]= [&[
            b"auth",
            self.program_authority.to_account_info().key.as_ref(),
            &[self.program_authority.bump]]
        ];

        let cpi_ctx = CpiContext::new_with_signer(cpi_program, close_accounts, &signer_seeds);

        close_account(cpi_ctx)
    }
    

    fn close_order_account(&mut self) -> Result<()> {

        let cpi_program = self.system_program.to_account_info();


        let close_accounts = CloseAccount {
            account: self.order.to_account_info(),
            destination: self.treasury_vault.to_account_info(),
            authority: self.program_authority.to_account_info()
        };

        let signer_seeds : [&[&[u8]] ;1]= [&[
            b"auth",
            self.program_authority.to_account_info().key.as_ref(),
            &[self.program_authority.bump]]
        ];

        let cpi_ctx = CpiContext::new_with_signer(cpi_program, close_accounts, &signer_seeds);

        close_account(cpi_ctx)
    }

    fn charge_fee_to_treasury(&mut self, protocol_vault: AccountInfo<'info> ) -> Result<()> {

        let fee_amount_ = self.global_config.fee_bps * self.order.drift_perp_amount / 10000;

        let transfer_cpi_program = self.token_program.to_account_info();

        let transfer_accounts = TransferChecked {
            from: protocol_vault,
            mint: self.usdc_mint.to_account_info(),
            to: self.treasury_vault.to_account_info(),
            authority: self.program_authority.to_account_info()
        };

        let signer_seeds : [&[&[u8]] ;1]= [&[
            b"auth",
            self.program_authority.to_account_info().key.as_ref(),
            &[self.program_authority.bump]]
        ];

        let cpi_ctx = CpiContext::new_with_signer(transfer_cpi_program.clone(), 
        transfer_accounts, &signer_seeds);
        
        transfer_checked(cpi_ctx, fee_amount_, self.usdc_mint.decimals)
    }

    fn transfer_to_user(&mut self, amount : u64, protocol_vault: AccountInfo<'info> ) -> Result<()> {
        let transfer_cpi_program = self.token_program.to_account_info();

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

        let cpi_ctx = CpiContext::new_with_signer(transfer_cpi_program.clone(), transfer_accounts, &signer_seeds);
        
        transfer_checked(cpi_ctx, amount, self.usdc_mint.decimals)
    }
}