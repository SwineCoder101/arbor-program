use anchor_lang::prelude::*;


#[error_code]
pub enum ArborError {
    #[msg("Health factor too low")]
    HealthTooLow,
    #[msg("Signer is not the owner of the order, cannot close order")]
    UnAuthorizedCloseOrder,
    #[msg("Signer is not the owner of the order, cannot claim yield")]
    UnAuthorizedClaimYield,
    #[msg("Signer is not the owner of the order, cannot top up order")]
    UnAuthorizedTopUpOrder,
    #[msg("client error: Invalid side, please check the side of the order")]
    InvalidSide,
}
