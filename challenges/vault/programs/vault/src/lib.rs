use anchor_lang::prelude::*;
use anchor_lang::system_program::{Transfer, transfer};


declare_id!("7Qc3nfhGh6tJgRJMVjDcek83SD4pLnCr5vbYC4Rn7Sxs");

#[program]
pub mod vault {
    use super::*;

    pub fn deposit(ctx: Context<Deposit>, seed: u64, amount: u64) -> Result<()> {
        ctx.accounts.vault_state.set_inner(VaultState {
            maker: ctx.accounts.maker.key(),
            taker: ctx.accounts.taker.key(),
            seed,
            state_bump: ctx.bumps.vault_state,
            vault_keeper: ctx.accounts.vault_keeper.key(),
            vault_bump: ctx.bumps.vault_keeper,
            created_at: Clock::get()?.unix_timestamp,
            amount: amount
        });
        
        let transfer_accounts = Transfer {
            from: ctx.accounts.maker.to_account_info(),
            to: ctx.accounts.vault_keeper.to_account_info(),
        };
        let cpi_context = CpiContext::new(ctx.accounts.system_program.to_account_info(), transfer_accounts);
        transfer(cpi_context, amount)
    }


    pub fn cancel(ctx: Context<Cancel>) -> Result<()> {

        let transfer_accounts = Transfer {
            from: ctx.accounts.vault_keeper.to_account_info(),
            to: ctx.accounts.maker.to_account_info(),
        };
        
        let vault_state = ctx.accounts.vault_state.key();
        let seeds = &[
            "vault".as_bytes(),
            vault_state.as_ref(),
            &[ctx.accounts.vault_state.vault_bump],
        ];
        let signer_seeds = &[&seeds[..]];

    
        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(), 
            transfer_accounts, 
            signer_seeds);
        transfer(cpi_context, ctx.accounts.vault_keeper.get_lamports())
        
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let transfer_accounts = Transfer {
            from: ctx.accounts.vault_keeper.to_account_info(),
            to: ctx.accounts.taker.to_account_info(),
        };
        
        let vault_state = ctx.accounts.vault_state.key();
        let seeds = &[
            "vault".as_bytes(),
            vault_state.as_ref(),
            &[ctx.accounts.vault_state.vault_bump],
        ];
        let signer_seeds = &[&seeds[..]];

    
        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(), 
            transfer_accounts, 
            signer_seeds);
        transfer(cpi_context, ctx.accounts.vault_keeper.get_lamports())
    }
}

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,
    pub taker: SystemAccount<'info>,
    #[account(
        mut,
        seeds = [
            b"vault",
            vault_state.key().as_ref(),
        ],
        bump
    )]
    pub vault_keeper: SystemAccount<'info>,
    #[account(init,
    payer = maker,
    seeds = [
        b"vault_state",
        seed.to_le_bytes().as_ref(),
        maker.key().as_ref(),
        taker.key().as_ref()
    ], 
    bump, 
    space = VaultState::INIT_SPACE)]
    pub vault_state: Account<'info, VaultState>,
    pub system_program: Program<'info, System>,
}


impl Space for VaultState {
    const INIT_SPACE: usize = 8 + 32 + 32 + 8 + 1 + 32 + 1 + 8 + 8;
}

#[account]
pub struct VaultState {
    pub maker: Pubkey,
    pub taker: Pubkey,
    pub seed: u64,
    pub state_bump: u8,
    pub vault_keeper: Pubkey,
    pub vault_bump: u8,
    pub created_at: i64,
    pub amount: u64,
}

#[derive(Accounts)]
pub struct Cancel<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"vault",
            vault_state.key().as_ref(),
        ],
        bump = vault_state.vault_bump
    )]
    pub vault_keeper: SystemAccount<'info>,
    #[account(mut, 
        has_one = maker,
        constraint = vault_keeper.key() == vault_state.vault_keeper,
        close = maker,
        seeds = [
            b"vault_state",
            vault_state.seed.to_le_bytes().as_ref(),
            vault_state.maker.as_ref(),
            vault_state.taker.as_ref()
        ], 
        bump = vault_state.state_bump
    )]
    pub vault_state: Account<'info, VaultState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,
    #[account(mut)]
    pub maker: SystemAccount<'info>,
    #[account(
        mut,
        seeds = [
            b"vault",
            vault_state.key().as_ref(),
        ],
        bump = vault_state.vault_bump
    )]
    pub vault_keeper: SystemAccount<'info>,
    #[account(mut, 
        has_one = taker,
        constraint = vault_keeper.key() == vault_state.vault_keeper,
        close = maker,
        seeds = [
            b"vault_state",
            vault_state.seed.to_le_bytes().as_ref(),
            vault_state.maker.as_ref(),
            vault_state.taker.as_ref()
        ], 
        bump = vault_state.state_bump
    )]
    pub vault_state: Account<'info, VaultState>,
    pub system_program: Program<'info, System>,
}

