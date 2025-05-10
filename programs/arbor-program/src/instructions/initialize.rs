use anchor_lang::prelude::*;

use crate::{GlobalConfig, ProgramAuthority};

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    
    #[account(
        init,
        payer = signer,
        space = GlobalConfig::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub global_config: Account<'info, GlobalConfig>,
    
    #[account(
        init,
        payer = signer,
        space = ProgramAuthority::INIT_SPACE,
        seeds = [b"auth"],
        bump
    )]
    pub program_authority: Account<'info, ProgramAuthority>,
 
    pub system_program: Program<'info, System>,
}


impl<'info> InitializeConfig<'info> {
    pub fn initialize_config(&mut self, fee_bps: u64, admin: Pubkey, usdc_mint: Pubkey, bump: u8, program_authority_bump: u8) -> Result<()> {
        
        self.global_config.set_inner(GlobalConfig {
            fee_bps,
            admin,
            usdc_mint,
            bump,
        });

        self.program_authority.bump = program_authority_bump;
        
        Ok(())
    }
}

