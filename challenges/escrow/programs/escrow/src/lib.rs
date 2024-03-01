use anchor_lang::prelude::*;
pub mod constants;
pub mod instructions;
pub mod state;

use instructions::*;
declare_id!("4hzLM36fkm3KKd9ywRxdqdUji62qDcGMCwiGt9i4TahQ");

#[program]
pub mod escrow {
    use super::*;

    pub fn make_escrow(ctx: Context<Make>, seed: u64, amount: u64) -> Result<()> {
        // let bumps = ctx.bumps;
        ctx.accounts.transfer(amount)?;
        ctx.accounts.make(seed, amount, &ctx.bumps)
    }

    pub fn refund_escrow(ctx: Context<Refund>) -> Result<()> {
        ctx.accounts.empty_vault()?;
        ctx.accounts.close_vault()
    }

    pub fn take_escrow(ctx: Context<Take>) -> Result<()> {
        ctx.accounts.pay_back()?;
        ctx.accounts.take()
    }
}
