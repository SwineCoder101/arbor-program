use anchor_lang::prelude::*;

use anchor_spl::{associated_token::*, token::{Token}, token_interface::{transfer_checked, Mint, TokenAccount, TransferChecked, close_account, CloseAccount}};

use crate::{error::ArborError, other::{GlobalConfig}, state::Order};
#[derive(Accounts)]
pub struct TopUpOrder<'info> {

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
        seeds = [b"order", order.owner.key().as_ref(), &order.seed.to_le_bytes()],
        bump = order.bump,
        has_one = owner
    )]
    pub order: Account<'info, Order>,

    #[account(seeds = [b"config"], bump = global_config.bump, has_one = usdc_mint)]
    pub global_config: Account<'info, GlobalConfig>,


    /// CHECK: 
    #[account(seeds = [b"auth"], bump = global_config.auth_bump)]
    pub program_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"vault", b"jupit", order.key().as_ref()],
        bump = order.jup_vault_bump,
        token::mint = usdc_mint,
        token::authority = program_authority,
        token::token_program = token_program,
    )]
    pub jupiter_vault: InterfaceAccount<'info, TokenAccount>,


    #[account(
        mut,
        seeds = [b"vault", b"drift", order.key().as_ref()],
        bump = order.drift_vault_bump,
        token::mint = usdc_mint,
        token::authority = program_authority,
        token::token_program = token_program,
    )]
    pub drift_vault: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> TopUpOrder<'info> {

    

    pub fn top_up_order(&mut self, drift_amount: u64, jupiter_amount: u64) -> Result<()> {

        // self.order.drift_perp_amount = self.order.drift_perp_amount.check_add(drift_amount).ok_or(Error::whatever)?;


        if drift_amount > 0  && drift_amount < u64::MAX{
            self.transfer_to_vault(drift_amount, self.drift_vault.to_account_info())?;
            self.order.drift_perp_amount += drift_amount;
        }
        if jupiter_amount > 0 && jupiter_amount < u64::MAX {
            self.transfer_to_vault(jupiter_amount, self.jupiter_vault.to_account_info())?;
            self.order.jup_perp_amount += jupiter_amount;
        }
        Ok(())
    }



    fn transfer_to_vault(&mut self, amount : u64, protocol_vault: AccountInfo<'info> ) -> Result<()> {
        let transfer_cpi_program = self.token_program.to_account_info();
        
        let transfer_accounts = TransferChecked {
            from: self.owner_ata.to_account_info(),
            mint: self.usdc_mint.to_account_info(),
            to: protocol_vault,
            authority: self.owner.to_account_info()
        };

        let cpi_ctx = CpiContext::new(transfer_cpi_program, transfer_accounts);

        transfer_checked(cpi_ctx, amount, self.usdc_mint.decimals)
    }
}