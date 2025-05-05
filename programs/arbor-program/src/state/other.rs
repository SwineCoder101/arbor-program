use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct GlobalConfig {
    fee_bps: u64,
    admin: Pubkey,
}


#[account]
#[derive(InitSpace)]
pub struct ProgramAuthority {

}