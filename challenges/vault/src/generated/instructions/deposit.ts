/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as beet from '@metaplex-foundation/beet'
import * as web3 from '@solana/web3.js'

/**
 * @category Instructions
 * @category Deposit
 * @category generated
 */
export type DepositInstructionArgs = {
  seed: beet.bignum
  amount: beet.bignum
  lockSeconds: beet.bignum
}
/**
 * @category Instructions
 * @category Deposit
 * @category generated
 */
export const depositStruct = new beet.BeetArgsStruct<
  DepositInstructionArgs & {
    instructionDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['seed', beet.u64],
    ['amount', beet.u64],
    ['lockSeconds', beet.i64],
  ],
  'DepositInstructionArgs'
)
/**
 * Accounts required by the _deposit_ instruction
 *
 * @property [_writable_, **signer**] maker
 * @property [] taker
 * @property [_writable_] vaultKeeper
 * @property [_writable_] vaultState
 * @category Instructions
 * @category Deposit
 * @category generated
 */
export type DepositInstructionAccounts = {
  maker: web3.PublicKey
  taker: web3.PublicKey
  vaultKeeper: web3.PublicKey
  vaultState: web3.PublicKey
  systemProgram?: web3.PublicKey
}

export const depositInstructionDiscriminator = [
  242, 35, 198, 137, 82, 225, 242, 182,
]

/**
 * Creates a _Deposit_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @param args to provide as instruction data to the program
 *
 * @category Instructions
 * @category Deposit
 * @category generated
 */
export function createDepositInstruction(
  accounts: DepositInstructionAccounts,
  args: DepositInstructionArgs,
  programId = new web3.PublicKey('7Qc3nfhGh6tJgRJMVjDcek83SD4pLnCr5vbYC4Rn7Sxs')
) {
  const [data] = depositStruct.serialize({
    instructionDiscriminator: depositInstructionDiscriminator,
    ...args,
  })
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.maker,
      isWritable: true,
      isSigner: true,
    },
    {
      pubkey: accounts.taker,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.vaultKeeper,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.vaultState,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.systemProgram ?? web3.SystemProgram.programId,
      isWritable: false,
      isSigner: false,
    },
  ]

  const ix = new web3.TransactionInstruction({
    programId,
    keys,
    data,
  })
  return ix
}
