use anchor_lang::prelude::*;

#[error_code]
pub enum EscrowErrorCode {
    #[msg("Custom error message")]
    CustomError,
    #[msg("The target has not been reached")]
    TargetNotReached,
    #[msg("The target has been reached")]
    TargetReached,
}
