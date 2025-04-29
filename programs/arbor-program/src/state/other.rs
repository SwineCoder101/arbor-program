

#[account]
#[derive(InitSpace)]
/// Global configuration for the program
pub struct GlobalConfig {
    fee_bps: u64,
    admin: Pubkey,
}


#[account]
#[derive(InitSpace)]
pub struct ProgramAuthority {
}



