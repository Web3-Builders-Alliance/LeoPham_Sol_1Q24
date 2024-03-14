pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("EeiDqX7YEc2tmNsDpygDHEjFR5D2N5ffobzPD6CT34Ud");

#[program]
pub mod escrow_donate {
    use super::*;

    pub fn make(ctx: Context<Make>, amount: u64) -> Result<()> {
        ctx.accounts.handler(amount, &ctx.bumps)
    }

    pub fn donate(ctx: Context<Donate>, amount: u64) -> Result<()> {
        ctx.accounts.handler(amount)
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        ctx.accounts.handler()
    }
}
