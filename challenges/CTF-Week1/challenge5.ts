import { Connection, Keypair, SystemProgram, PublicKey } from "@solana/web3.js";
import {
  Program,
  Wallet,
  AnchorProvider,
  Address,
  BN,
} from "@project-serum/anchor";
import { Week1, IDL } from "./programs/week1";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

import wallet from "./wallet/wba-wallet.json";

// We're going to import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

// Create a devnet connection
const connection = new Connection("https://api.devnet.solana.com");

// Create our anchor provider
const provider = new AnchorProvider(connection, new Wallet(keypair), {
  commitment: "confirmed",
});

// Create our program
const program = new Program<Week1>(
  IDL,
  "ctf1VWeMtgxa24zZevsXqDg6xvcMVy4FbP3cxLCpGha" as Address,
  provider
);

// Use the PDA for our CTF-Week1 profile
const profilePda = PublicKey.findProgramAddressSync(
  [Buffer.from("profile"), keypair.publicKey.toBuffer()],
  program.programId
)[0];

// Use the PDA for the Auth account
const authPda = PublicKey.findProgramAddressSync(
  [Buffer.from("auth")],
  program.programId
)[0];

// Paste here the mint address for challenge1 token
const mint = new PublicKey("pi29ZewBwbbJmhdNiWT3Pr6ddXSWun2Qqw8hYdNxXxp");

(async () => {
  try {
    // Create the ATA for your Wallet
    const ownerAta = getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      mint,
      keypair.publicKey
    );
    // Mint some tokens!
    const mintTx = await mintTo(
      connection,
      keypair,
      mint,
      (
        await ownerAta
      ).address,
      keypair.publicKey,
      1000000000
    );
    // Complete the Challenge!
    const completeTx = await program.methods
      .completeChallenge5()
      .accounts({
        owner: keypair.publicKey,
        ata: (await ownerAta).address,
        profile: profilePda,
        mint: mint,
        authority: authPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([keypair])
      .rpc();
    console.log(`Success! Check out your TX here:
    https://explorer.solana.com/tx/${completeTx}?cluster=devnet`);
  } catch (e) {
    console.error(`Oops, something went wrong: ${e}`);
  }
})();
