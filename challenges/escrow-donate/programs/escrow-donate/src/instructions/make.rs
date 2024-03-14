use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::{Escrow, ESCROW_SEED};

#[derive(Accounts)]
pub struct Make<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        init_if_needed,
        payer = maker,
        associated_token::mint = mint,
        associated_token::authority = maker,
    )]
    pub maker_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init,
        payer = maker,
        seeds = [
           ESCROW_SEED.as_bytes(), 
            maker.key().as_ref(),
            mint.key().as_ref(),
        ],
        bump,
        space = Escrow::INIT_SPACE,
    )]
    pub escrow: Account<'info, Escrow>,
    #[account(
        init_if_needed,
        payer = maker,
        associated_token::mint = mint,
        associated_token::authority = escrow,
    )]
    pub escrow_ata: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> Make<'info> {
    pub fn handler(&mut self, amount: u64, bumps: &MakeBumps) -> Result<()> {
        self.escrow.mint = self.mint.key();
        self.escrow.target = amount;
        self.escrow.bump = bumps.escrow;
        Ok(())
    }
}
