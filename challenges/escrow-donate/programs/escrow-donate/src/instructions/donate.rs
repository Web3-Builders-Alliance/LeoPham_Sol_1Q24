use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken, token::{transfer, Transfer}, token_interface::{Mint, TokenAccount, TokenInterface}
};

use crate::{error::EscrowErrorCode, state::Escrow, ESCROW_SEED};

#[derive(Accounts)]
pub struct Donate<'info> {
    #[account(mut)]
    pub donor: Signer<'info>,
    /// CHECK: This is just used to fetch the maker's address
    pub maker: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [
           ESCROW_SEED.as_bytes(), 
            maker.key().as_ref(),
            mint.key().as_ref(),
        ],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, Escrow>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = escrow,
    )]
    pub escrow_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = donor,
    )]
    pub donor_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = maker,
    )]
    pub maker_ata: InterfaceAccount<'info, TokenAccount>,
    pub mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> Donate<'info> {
  pub fn handler(&mut self, amount: u64) -> Result<()> {
    self.donate(amount)
  }

  pub fn donate(&mut self, amount: u64) -> Result<()> {
    let total_donated = self.escrow_ata.amount; // We fetch the amount of tokens that have been donated so far
    let remaining = self.escrow.target - total_donated; // We calculate the remaining amount of tokens that need to be donated

    require!(remaining > 0, EscrowErrorCode::TargetReached); // We check if the remaining amount of tokens that need to be donated is greater than 0

    let amount_to_transfer = match amount > remaining { // We check if the amount to donate is greater than the remaining amount
        true => remaining, // If the amount to donate is greater than the remaining amount, we donate the remaining amount
        false => amount, // Otherwise, we donate the amount that was specified
    };

    /*
    If the user donates 10% of the total amount, mint 10 reward tokens back to the donor
    For that we will need a new mint with the escrow as authority (probably init it in the make??)
    Don't forget that we are using integers (not floating point numbers)
    */

    let cpi_program = self.token_program.to_account_info();
    let cpi_accounts = Transfer {
        from: self.donor_ata.to_account_info(),
        to: self.escrow_ata.to_account_info(),
        authority: self.donor.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts); // We create a CPI context to transfer the tokens from the donor's ATA to the escrow's ATA
    transfer(cpi_ctx, amount_to_transfer)?; // We transfer the tokens from the donor's ATA to the escrow's ATA

    msg!("Donation of {} tokens successful", amount_to_transfer);
    msg!("Total donated: {}", self.escrow_ata.amount);
    
    Ok(())
  }

  pub fn check_donations(&self) -> Result<()> {
    let mint = self.mint.key().clone();

    match self.escrow_ata.amount >= self.escrow.target { // We check if the escrow account has reached its target
        true => { // If the escrow account has reached its target, we transfer the tokens from the escrow's ATA to the maker's ATA
            let seeds = &[
                ESCROW_SEED.as_bytes(), 
                self.maker.key.as_ref(),
                mint.as_ref(),
                &[self.escrow.bump],
            ];
            let signer_seeds = &[&seeds[..]];

            let cpi_program = self.token_program.to_account_info();
            let cpi_accounts = Transfer {
                from: self.escrow_ata.to_account_info(),
                to: self.maker_ata.to_account_info(),
                authority: self.escrow.to_account_info(),
            };
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
            transfer(cpi_ctx, self.escrow_ata.amount)?;
        }
        false => msg!("The escrow account has not reached its target yet"),
    }
    
    Ok(())
  }
}