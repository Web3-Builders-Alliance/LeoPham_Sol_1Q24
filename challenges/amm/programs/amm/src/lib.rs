pub mod constants;
pub mod error;
pub mod helpers;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("AGJvLGpYQvcu7p6kUn6EVguPHq69gzyykugwnussxYDZ");

#[program]
pub mod amm {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        seed: u64,
        fee: u16,
        authority: Option<Pubkey>,
    ) -> Result<()> {
        initialize::handler(ctx, seed, fee, authority)
    }

    pub fn deposit(
        ctx: Context<Deposit>,
        amount: u64,
        max_x: u64,
        max_y: u64,
        expiration: i64,
    ) -> Result<()> {
        ctx.accounts.deposit(amount, max_x, max_y, expiration)
    }

    pub fn swap(
        ctx: Context<Swap>,
        is_x: bool,
        amount: u64, // Amount of tokens we deposit
        min: u64,    // Minimum amount of tokens I'd be willing to withdraw
        expiration: i64,
    ) -> Result<()> {
        // Swap Token X for Token Y or vice versa
        msg!("Swap Token X for Token Y or vice versa");
        msg!("is_x: {}", is_x);
        msg!("amount: {}", amount);
        msg!("min: {}", min);
        ctx.accounts.swap(is_x, amount, min, expiration)
    }
}
