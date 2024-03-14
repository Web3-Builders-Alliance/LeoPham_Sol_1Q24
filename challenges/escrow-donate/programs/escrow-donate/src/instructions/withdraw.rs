use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken, token::{close_account, transfer, CloseAccount, Transfer}, token_interface::{Mint, TokenAccount, TokenInterface}
    
};

use crate::{error::EscrowErrorCode, state::Escrow, ESCROW_SEED};

#[derive(Accounts)]
pub struct Withdraw<'info> {
  #[account(mut)]
  pub maker: Signer<'info>,
  pub mint: InterfaceAccount<'info, Mint>,
  #[account(
    mut,
    seeds = [
        ESCROW_SEED.as_bytes(), 
        maker.key().as_ref(),
        mint.key().as_ref(),
    ],
    bump = escrow.bump,
    close = maker,
  )]
  pub escrow: Account<'info, Escrow>,
  #[account(
      mut,
      associated_token::mint = mint,
      associated_token::authority = escrow
  )]
  pub escrow_ata: InterfaceAccount<'info, TokenAccount>,
  #[account(
    mut,
    associated_token::mint = mint,
    associated_token::authority = maker,
  )]
  pub maker_ata: InterfaceAccount<'info, TokenAccount>,
  pub token_program: Interface<'info, TokenInterface>,
  pub associated_token_program: Program<'info, AssociatedToken>,
  pub system_program: Program<'info, System>,
}

impl<'info> Withdraw<'info>  {
    pub fn handler(&mut self) -> Result<()> {
      require!(self.escrow_ata.amount >= self.escrow.target, EscrowErrorCode::TargetNotReached); // We check if the escrow account has reached its target
      let mint = self.mint.key().clone();
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
      let close_accounts = CloseAccount {
        account: self.escrow_ata.to_account_info(),
        destination: self.maker.to_account_info(),
        authority: self.escrow.to_account_info(),
      };
      let cpi_ctx = CpiContext::new_with_signer(
          self.token_program.to_account_info(),
          close_accounts,
          signer_seeds,
      );

      close_account(cpi_ctx)?;
      Ok(())
    }
}
