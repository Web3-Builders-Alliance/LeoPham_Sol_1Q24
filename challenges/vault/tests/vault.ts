import * as anchor from "@coral-xyz/anchor";
import { AnchorError, Program } from "@coral-xyz/anchor";
import { Vault } from "../target/types/vault";
import {
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from "@solana/web3.js";
import { assert, expect } from "chai";

const program = anchor.workspace.Vault as Program<Vault>;
const connection = anchor.getProvider().connection;
// Configure the client to use the local cluster.
anchor.setProvider(anchor.AnchorProvider.env());

const maker = Keypair.generate();
const taker = Keypair.generate();

const confirm = async (signature: string): Promise<string> => {
  const block = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    signature,
    ...block,
  });
  return signature;
};

const log = async (signature: string): Promise<string> => {
  console.log(
    `Your transaction signature: https://explorer.solana.com/transaction/${signature}?cluster=custom&customUrl=${connection.rpcEndpoint}`
  );
  return signature;
};

it("Airdrop", async () => {
  await connection
    .requestAirdrop(maker.publicKey, LAMPORTS_PER_SOL * 10)
    .then(confirm);
  // .then(log);
  await connection
    .requestAirdrop(taker.publicKey, LAMPORTS_PER_SOL * 10)
    .then(confirm);
  // .then(log);
});
describe("Create and Cancel successfully", () => {
  const seed = new anchor.BN(1);
  const [vault_state] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("vault_state"),
      seed.toBuffer("le", 8),
      maker.publicKey.toBuffer(),
      taker.publicKey.toBuffer(),
    ],
    program.programId
  );

  const [vault_keeper] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), vault_state.toBuffer()],
    program.programId
  );

  it("Deposit SOL into Vault!", async () => {
    const tx = await program.methods
      .deposit(seed, new anchor.BN(1 * LAMPORTS_PER_SOL), new anchor.BN(1))
      .accounts({
        maker: maker.publicKey,
        taker: taker.publicKey,
        vaultKeeper: vault_keeper,
        vaultState: vault_state,
        systemProgram: SystemProgram.programId,
      })
      .signers([maker])
      .rpc();
    expect(tx).to.be.ok;
  });

  it("Cancel the deposit", async () => {
    const tx = await program.methods
      .cancel()
      .accounts({
        maker: maker.publicKey,
        vaultKeeper: vault_keeper,
        vaultState: vault_state,
        systemProgram: SystemProgram.programId,
      })
      .signers([maker])
      .rpc();
    expect(tx).to.be.ok;
  });
});

describe("Create and Claim successfully", () => {
  const seed = new anchor.BN(2);
  const [vault_state] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("vault_state"),
      seed.toBuffer("le", 8),
      maker.publicKey.toBuffer(),
      taker.publicKey.toBuffer(),
    ],
    program.programId
  );

  const [vault_keeper] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), vault_state.toBuffer()],
    program.programId
  );

  it("Deposit SOL into Vault!", async () => {
    const tx = await program.methods
      .deposit(seed, new anchor.BN(1 * LAMPORTS_PER_SOL), new anchor.BN(-1))
      .accounts({
        maker: maker.publicKey,
        taker: taker.publicKey,
        vaultKeeper: vault_keeper,
        vaultState: vault_state,
        systemProgram: SystemProgram.programId,
      })
      .signers([maker])
      .rpc();
    expect(tx).to.be.ok;
  });

  it("Claim the deposit", async () => {
    const tx = await program.methods
      .claim()
      .accounts({
        taker: taker.publicKey,
        maker: maker.publicKey,
        vaultKeeper: vault_keeper,
        vaultState: vault_state,
        systemProgram: SystemProgram.programId,
      })
      .signers([taker])
      .rpc();
    expect(tx).to.be.ok;
  });
});

describe("Create and Claim fail because lock_time is not expired", () => {
  const seed = new anchor.BN(3);
  const [vault_state] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("vault_state"),
      seed.toBuffer("le", 8),
      maker.publicKey.toBuffer(),
      taker.publicKey.toBuffer(),
    ],
    program.programId
  );

  const [vault_keeper] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), vault_state.toBuffer()],
    program.programId
  );

  it("Deposit SOL into Vault!", async () => {
    const tx = await program.methods
      .deposit(seed, new anchor.BN(1 * LAMPORTS_PER_SOL), new anchor.BN(5))
      .accounts({
        maker: maker.publicKey,
        taker: taker.publicKey,
        vaultKeeper: vault_keeper,
        vaultState: vault_state,
        systemProgram: SystemProgram.programId,
      })
      .signers([maker])
      .rpc();
    expect(tx).to.be.ok;
  });

  it("Claim the deposit", async () => {
    try {
      const tx = await program.methods
        .claim()
        .accounts({
          taker: taker.publicKey,
          maker: maker.publicKey,
          vaultKeeper: vault_keeper,
          vaultState: vault_state,
          systemProgram: SystemProgram.programId,
        })
        .signers([taker])
        .rpc();
    } catch (error) {
      assert.isTrue(error instanceof AnchorError);
      assert.equal(error.error.errorCode.number, 6000);
      assert.equal(error.error.errorMessage, "Vault has not expired");
    }
  });
});
