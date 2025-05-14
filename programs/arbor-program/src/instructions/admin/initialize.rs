use anchor_lang::prelude::*;

use crate::{GlobalConfig};

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    
    #[account(
        init,
        payer = signer,
        space = 8 + GlobalConfig::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub global_config: Account<'info, GlobalConfig>,
    
    ///CHECK: This is safe. It's just used to sign things
    #[account(
        seeds=[b"auth"],
            bump
    )]
    pub program_authority: UncheckedAccount<'info>,
 
    pub system_program: Program<'info, System>,
}


impl<'info> InitializeConfig<'info> {
    pub fn initialize_config(&mut self, bump: u8, program_authority_bump: u8, fee_bps: u64, admin: Pubkey, usdc_mint: Pubkey) -> Result<()> {
        
        self.global_config.set_inner(GlobalConfig {
            fee_bps,
            admin,
            usdc_mint,
            bump,
            auth_bump: program_authority_bump,
        });

        Ok(())
    }
}

