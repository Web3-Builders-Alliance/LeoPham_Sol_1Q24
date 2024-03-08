import * as anchor from "@coral-xyz/anchor";
import { BN, Program, web3 } from "@coral-xyz/anchor";
import { Amm } from "../target/types/amm";
import { randomBytes } from "crypto";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  Account,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const commitment: web3.Commitment = "confirmed";

// Helpers
const confirmTx = async (signature: string) => {
  console.log("Confirming tx: ", signature);
  const latestBlockhash = await anchor
    .getProvider()
    .connection.getLatestBlockhash();
  await anchor.getProvider().connection.confirmTransaction(
    {
      signature,
      ...latestBlockhash,
    },
    commitment
  );
};

const confirmTxs = async (signatures: string[]) => {
  await Promise.all(signatures.map(confirmTx));
};

describe("amm", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Amm as Program<Amm>;
  const connection = anchor.getProvider().connection;
  // Set up our keys
  const [initializer, user] = [
    web3.Keypair.generate(),
    web3.Keypair.generate(),
  ];

  // Random seed
  const seed = new BN(randomBytes(8));

  // PDAs
  const [auth] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("auth")],
    program.programId
  );
  const [config] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config"), seed.toBuffer().reverse()],
    program.programId
  );

  // Mints
  let mint_x: web3.PublicKey;
  let mint_y: web3.PublicKey;
  let [mint_lp] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("lp"), config.toBuffer()],
    program.programId
  );

  // ATAs
  let initializer_x_ata: Account;
  let initializer_y_ata: Account;
  let initializer_lp_ata: Account;
  let user_x_ata: Account;
  let user_y_ata: Account;

  let user_lp_ata: Account;
  let vault_x_ata: Account;
  let vault_y_ata: Account;

  let vault_lp_ata: Account;

  it("Airdrop", async () => {
    await Promise.all(
      [initializer, user].map(async (k) => {
        return await anchor
          .getProvider()
          .connection.requestAirdrop(
            k.publicKey,
            100 * anchor.web3.LAMPORTS_PER_SOL
          );
      })
    ).then(confirmTxs);
  });

  it("Create mint token!", async () => {
    // Mints
    mint_x = await createMint(connection, user, user.publicKey, null, 6);
    mint_y = await createMint(connection, user, user.publicKey, null, 6);
  });

  it("Create ata!", async () => {
    // ATAs
    initializer_x_ata = await getOrCreateAssociatedTokenAccount(
      connection,
      initializer,
      mint_x,
      initializer.publicKey
    );
    initializer_y_ata = await getOrCreateAssociatedTokenAccount(
      connection,
      initializer,
      mint_y,
      initializer.publicKey
    );
    // initializer_lp_ata = await getOrCreateAssociatedTokenAccount(
    //   connection,
    //   initializer,
    //   mint_lp,
    //   initializer.publicKey
    // );
    user_x_ata = await getOrCreateAssociatedTokenAccount(
      connection,
      user,
      mint_x,
      user.publicKey
    );
    user_y_ata = await getOrCreateAssociatedTokenAccount(
      connection,
      user,
      mint_y,
      user.publicKey
    );

    // user_lp_ata = await getOrCreateAssociatedTokenAccount(
    //   connection,
    //   user,
    //   mint_lp,
    //   user.publicKey
    // );
    vault_x_ata = await getOrCreateAssociatedTokenAccount(
      connection,
      user,
      mint_x,
      auth,
      true
    );
    vault_y_ata = await getOrCreateAssociatedTokenAccount(
      connection,
      user,
      mint_y,
      auth,
      true
    );

    // vault_lp_ata = await getOrCreateAssociatedTokenAccount(
    //   connection,
    //   user,
    //   mint_lp,
    //   auth
    // );
    await mintTo(
      connection,
      user,
      mint_x,
      initializer_x_ata.address,
      user.publicKey,
      21e8
    ).then(confirmTx);
    await mintTo(
      connection,
      user,
      mint_y,
      initializer_y_ata.address,
      user.publicKey,
      21e8
    ).then(confirmTx);
  });

  it("Initialize", async () => {
    // Add your test here.
    const tx = await program.methods
      .initialize(seed, 300, initializer.publicKey)
      .accounts({
        initializer: initializer.publicKey,
        mintX: mint_x,
        mintY: mint_y,
        mintLp: mint_lp,
        vaultX: vault_x_ata.address,
        vaultY: vault_y_ata.address,
        auth,
        config,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([initializer])
      .rpc();
    confirmTx(tx);
  });
});
