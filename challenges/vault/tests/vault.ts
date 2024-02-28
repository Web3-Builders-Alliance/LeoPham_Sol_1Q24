import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Vault } from "../target/types/vault";
import {
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from "@solana/web3.js";

const program = anchor.workspace.Vault as Program<Vault>;
const connection = anchor.getProvider().connection;

const maker = Keypair.generate();
const taker = Keypair.generate();
const seed = new anchor.BN(1);

const [vault] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("vault"),
    seed.toBuffer("le", 8),
    maker.publicKey.toBuffer(),
    taker.publicKey.toBuffer(),
  ],
  program.programId
);

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
    .then(confirm)
    .then(log);
  await connection
    .requestAirdrop(taker.publicKey, LAMPORTS_PER_SOL * 10)
    .then(confirm)
    .then(log);
});
describe("vault", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  it("Deposit SOL into Vault!", async () => {
    console.log({ makerDeposit: maker.publicKey.toBase58() });
    // Add your test here.
    const tx = await program.methods
      .deposit(seed, new anchor.BN(1 * LAMPORTS_PER_SOL))
      .accounts({
        maker: maker.publicKey,
        taker: taker.publicKey,
        vault,
        systemProgram: SystemProgram.programId,
      })
      .signers([maker])
      .rpc();

    log(tx);
  });

  it("Cancel the deposit", async () => {
    console.log({ maker: maker.publicKey.toBase58() });
    // Add your test here.
    const tx = await program.methods
      .cancel()
      .accounts({
        maker: maker.publicKey,
        vault,
        systemProgram: SystemProgram.programId,
      })
      .signers([maker])
      .rpc();
    console.log("Your transaction signature", tx);
  });

  // it("Claim the deposit", async () => {
  //   console.log(taker.publicKey.toBase58());
  //   // Add your test here.
  //   const tx = await program.methods
  //     .claim()
  //     .accounts({
  //       taker: taker.publicKey,
  //       vault,
  //       systemProgram: SystemProgram.programId,
  //     })
  //     .signers([taker])
  //     .rpc();
  //   log(tx);
  // });
});
