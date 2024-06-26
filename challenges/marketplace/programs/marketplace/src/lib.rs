pub mod constants;
pub mod errors;
mod helpers;
pub mod instructions;
pub mod state;
use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;

declare_id!("HeCEGvopBbsaZdZHj9xSzfFcwwDncjb1ofvCdYTQ1BRA");

#[program]
pub mod marketplace {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, name: String, fee: u16) -> Result<()> {
        ctx.accounts.init(&ctx.bumps, name, fee)
    }

    pub fn whitelist_collection(ctx: Context<WhitelistCollection>) -> Result<()> {
        ctx.accounts.whitelist(&ctx.bumps)
    }

    pub fn list(ctx: Context<List>, price: u64) -> Result<()> {
        ctx.accounts.create_listing(&ctx.bumps, price)?;
        ctx.accounts.deposit_nft()
    }

    pub fn delist(ctx: Context<Delist>) -> Result<()> {
        ctx.accounts.withdraw_nft()
    }

    pub fn purchase(ctx: Context<Purchase>) -> Result<()> {
        ctx.accounts.send_sol()?;
        ctx.accounts.send_nft()?;
        ctx.accounts.close_mint_ata()
    }
}
