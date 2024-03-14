use anchor_lang::prelude::*;

use crate::{DISCRIMINATOR_SIZE, PUBKEY_SIZE, U64_SIZE, U8_SIZE};

#[account]
pub struct Escrow {
    pub mint: Pubkey,
    pub target: u64,
    pub bump: u8,
}

impl Space for Escrow {
    const INIT_SPACE: usize = DISCRIMINATOR_SIZE + PUBKEY_SIZE + U64_SIZE + U8_SIZE;
}
