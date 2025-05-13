use anchor_lang::prelude::*;

use anchor_spl::{associated_token::*, token::{Token}, token_interface::{transfer_checked, Mint, TokenAccount, TransferChecked}};

use crate::{error::ArborError, other::{GlobalConfig, ProgramAuthority}, state::Order};

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct CreateOrder<'info> {

    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        associated_token::token_program = token_program,
        associated_token::mint = global_config.usdc_mint,
        associated_token::authority = owner
    )]
    pub owner_ata: InterfaceAccount<'info,TokenAccount>,

    #[account(mint::token_program = token_program)]
    pub usdc_mint: InterfaceAccount<'info,Mint>,

    #[account(
        init,
        payer = owner,
        space = 8 + Order::INIT_SPACE,
        seeds = [b"order", owner.key().as_ref(), &seed.to_le_bytes()],
        bump
    )]
    pub order: Account<'info, Order>,

    #[account(mut, seeds = [b"config"], bump = global_config.bump)]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(mut, seeds = [b"auth"], bump)]
    pub program_authority: Account<'info, ProgramAuthority>,


    #[account(
        init_if_needed,
        payer = owner,
        seeds = [b"vault", b"jupit", order.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = program_authority,
        token::token_program = token_program,
    )]
    pub jupiter_vault: InterfaceAccount<'info, TokenAccount>,


    #[account(
        init_if_needed,
        payer = owner,
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

impl<'info> CreateOrder<'info> {

    #[allow(clippy::too_many_arguments)]
    pub fn create_order(
        &mut self,
        seed: u64,
        bumps: &CreateOrderBumps,
        jup_perp_amount: u64,
        drift_perp_amount: u64,
        ratio_bps:         u64,
        drift_perp_idx:    u64,
        jup_perp_idx:      u64,
        drift_side:        u8,    // 0 long, 1 short
        jup_side:          u8,    // 0 long, 1 short
    ) -> Result<()> {

        let last_arbitrage_rate = 0;
        let last_price_pv = 0;

        // // 1. send USDC margin to Drift & Jupiter
        // todo!("SPL Token transfers to margin accounts");

        // // 2. open long + short perps
        // todo!("Drift CPI: open_position");
        // todo!("Jupiter Perps CPI: open_position");

        // 3. write order fields
        self.order.set_inner(Order{
            seed,
            bump: bumps.order,
            owner: self.owner.key(),
            is_open: true,
            ratio_bps,
            drift_perp_idx,
            drift_side: drift_side.clamp(0, 1),
            jup_side: jup_side.clamp(0, 1),
            jup_perp_idx,
            last_arbitrage_rate,
            last_price_pv,
            drift_perp_amount,
            jup_perp_amount,
        });

        self.transfer_to_vault(drift_perp_amount, self.drift_vault.to_account_info())?;
        self.transfer_to_vault(jup_perp_amount, self.jupiter_vault.to_account_info())

    }

    pub fn top_up_order(&mut self, drift_amount: u64, jupiter_amount: u64) -> Result<()> {

        require_eq!(self.order.owner, self.owner.key(), ArborError::UnAuthorizedTopUpOrder);
        
        if drift_amount > 0 {
            self.transfer_to_vault(drift_amount, self.drift_vault.to_account_info())?;
            self.order.drift_perp_amount += drift_amount;
        }
        if jupiter_amount > 0 {
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
            authority: self.owner.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(transfer_cpi_program.clone(), transfer_accounts);
        
        transfer_checked(cpi_ctx, amount, self.usdc_mint.decimals)
    }

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