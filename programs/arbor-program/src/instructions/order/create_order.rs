use anchor_lang::prelude::*;

use anchor_spl::{associated_token::*, token::{Token,Transfer}, token_2022::AmountToUiAmount, token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked}};

use crate::{state::Order, GlobalConfig, ProgramAuthority};

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct CreateOrder<'info> {
    
    #[account(mut)]
    pub owner: Signer<'info>,

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


    #[account(mut, 
        associated_token::token_program = token_program,
        associated_token::mint = global_config.usdc_mint,
        associated_token::authority = program_authority
    )]
    pub treasury_vault: InterfaceAccount<'info, TokenAccount>,


    #[account(mint::token_program = token_program)]
    pub collateral_mint: InterfaceAccount<'info,Mint>,

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
        amount_collateral: u64,
        nonce:             u64,
        ratio_bps:         u64,
        drift_perp_idx:    u64,
        jup_perp_idx:      u64,
        drift_side:        u8,    // 0 long, 1 short
        jup_side:          u8,    // 0 long, 1 short
        reserve_address: Pubkey,
        liquidity_address: Pubkey,
        ctoken_mint: Pubkey,
        collateral_amount: u64,
        underlying_collateral_mint: Pubkey,
    ) -> Result<()> {

        let last_arbitrage_rate = 0;
        let last_price_pv = 0;



        // // 1. deposit collateral + borrow USDC from Save
        // todo!("Solend CPI: deposit & borrow");

        // // 2. send USDC margin to Drift & Jupiter
        // todo!("SPL Token transfers to margin accounts");

        // // 3. open long + short perps
        // todo!("Drift CPI: open_position");
        // todo!("Jupiter Perps CPI: open_position");

        // 4. write order fields
        self.order.set_inner(Order{
            seed,
            bump: bumps.order,
            owner: self.owner.key(),
            is_open: true,
            ratio_bps,
            drift_perp_idx,
            drift_side,
            jup_side,
            jup_perp_idx,
            reserve_address,
            liquidity_address,
            ctoken_mint,
            collateral_amount,
            underlying_collateral_mint,
            last_arbitrage_rate,
            last_price_pv
        });

        Ok(())
    }
}