use anchor_lang::prelude::*;
use anchor_lang::system_program::{Transfer, transfer};
declare_id!("2dREcN2DnAdAD9mx66UoXiaVfAJxLnSwyz5VovCxrD3W");

#[program]
pub mod vault {
    use super::*;

    pub fn deposit(ctx: Context<Deposit>, seed: u64, amount: u64) -> Result<()> {
        ctx.accounts.vault.set_inner(Vault {
            maker: ctx.accounts.maker.key(),
            taker: ctx.accounts.taker.key(),
            seed,
            bump: ctx.bumps.vault,
            created_at: Clock::get()?.unix_timestamp,
            amount: amount
        });
        
        let transfer_accounts = Transfer {
            from: ctx.accounts.maker.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
        };
        let cpi_context = CpiContext::new(ctx.accounts.system_program.to_account_info(), transfer_accounts);
        transfer(cpi_context, amount)
    }


    pub fn cancel(ctx: Context<Cancel>) -> Result<()> {
        let maker = &ctx.accounts.maker;
        let vault = &ctx.accounts.vault;
        let transfer_accounts = Transfer {
            from: vault.to_account_info(),
            to: maker.to_account_info(),
        };

        let seed = vault.seed.to_le_bytes();
        let seeds = &[
            b"vault",
            seed.as_ref(),
            vault.maker.as_ref(),
            vault.taker.as_ref(),
            &[vault.bump],
        ];
        let signer_seeds = &[&seeds[..]];
        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(), 
            transfer_accounts, 
            signer_seeds);
        transfer(cpi_context, vault.amount)
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let taker = &ctx.accounts.taker;
        let vault = &ctx.accounts.vault;
        let transfer_accounts = Transfer {
            from: vault.to_account_info(),
            to: taker.to_account_info(),
        };

        let seed = vault.seed.to_le_bytes();
        let seeds = &[
            b"vault",
            seed.as_ref(),
            vault.maker.as_ref(),
            vault.taker.as_ref(),
            &[vault.bump],
        ];
        let signer_seeds = &[&seeds[..]];
        let cpi_context = CpiContext::new_with_signer(ctx.accounts.system_program.to_account_info(), transfer_accounts, signer_seeds);
        transfer(cpi_context, vault.amount)
    }
}

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,
    /// CHECK: This is ok
    pub taker: UncheckedAccount<'info>,
    #[account(init,
    payer = maker,
    seeds = [
        b"vault",
        seed.to_le_bytes().as_ref(),
        maker.key().as_ref(),
        taker.key().as_ref()
    ], 
    bump, 
    space = Vault::INIT_SPACE)]
    pub vault: Account<'info, Vault>,
    pub system_program: Program<'info, System>,
}


impl Space for Vault {
    const INIT_SPACE: usize = 8 + 32 + 32 + 8 + 1 + 8 + 8;
}

#[account]
pub struct Vault {
    pub maker: Pubkey,
    pub taker: Pubkey,
    pub seed: u64,
    pub bump: u8,
    pub created_at: i64,
    pub amount: u64,
}

#[derive(Accounts)]
pub struct Cancel<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,
    #[account(mut, 
        has_one = maker,
        seeds = [
            b"vault",
            vault.seed.to_le_bytes().as_ref(),
            vault.maker.key().as_ref(),
            vault.taker.key().as_ref()
        ], 
        bump)]
    pub vault: Account<'info, Vault>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,
    #[account(mut, 
        has_one = taker,
        seeds = [
            b"vault",
            vault.seed.to_le_bytes().as_ref(),
            vault.maker.key().as_ref(),
            vault.taker.key().as_ref()
        ], 
        bump)]
    pub vault: Account<'info, Vault>,
    pub system_program: Program<'info, System>,
}

