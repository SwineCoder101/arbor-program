use anchor_lang::prelude::*;

use anchor_spl::{token::{Token}, token_interface::{transfer_checked, Mint, TokenAccount, TransferChecked}};

use crate::{state::{Order, GlobalConfig}};

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct CreateOrder<'info> {

    #[account(mut)]
    pub owner: Signer<'info>,

    
    #[account(
        mut,
        token::token_program = token_program,
        token::mint = global_config.usdc_mint,
        token::authority = owner
    )]
    pub owner_ata: Box<InterfaceAccount<'info,TokenAccount>>,

    #[account(mint::token_program = token_program)]
    pub usdc_mint: Box<InterfaceAccount<'info,Mint>>,

    #[account(
        init,
        payer = owner,
        space = 8 + Order::INIT_SPACE,
        seeds = [b"order", owner.key().as_ref(), &seed.to_le_bytes()],
        bump
    )]
    pub order: Account<'info, Order>,

    #[account(seeds = [b"config"], bump = global_config.bump, has_one = usdc_mint)]
    pub global_config: Account<'info, GlobalConfig>,

    /// CHECK: This is safe
    #[account(seeds = [b"auth"], bump = global_config.auth_bump)]
    pub program_authority: UncheckedAccount<'info>,


    #[account(
        mut,
        seeds = [b"vault-jup", order.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = program_authority,
        token::token_program = token_program,
    )]
    pub jupiter_vault: Box<InterfaceAccount<'info, TokenAccount>>,


    #[account(
        mut,
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

impl<'info> CreateOrder<'info> {

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

        self.order.set_inner(Order{
            seed,
            bump: bumps.order,
            owner: self.owner.key(),
            is_open: true,
            ratio_bps,
            drift_perp_idx,
            drift_side: drift_side,
            jup_side: jup_side,
            jup_perp_idx,
            last_arbitrage_rate,
            last_price_pv,
            drift_perp_amount,
            jup_perp_amount,
            jup_vault_bump: bumps.jupiter_vault,
            drift_vault_bump: bumps.drift_vault
        });

        self.transfer_to_vault(drift_perp_amount, self.drift_vault.to_account_info())?;
        self.transfer_to_vault(jup_perp_amount, self.jupiter_vault.to_account_info())

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
}