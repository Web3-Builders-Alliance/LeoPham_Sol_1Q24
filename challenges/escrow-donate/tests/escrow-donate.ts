import * as anchor from "@coral-xyz/anchor";
import { AnchorError, Program, web3 } from "@coral-xyz/anchor";
import { EscrowDonate } from "../target/types/escrow_donate";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Account,
  TOKEN_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { expect } from "chai";

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

describe("escrow-donate", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const connection = anchor.getProvider().connection;

  const program = anchor.workspace.EscrowDonate as Program<EscrowDonate>;

  const [maker, donor1, donor2] = [
    web3.Keypair.generate(),
    web3.Keypair.generate(),
    web3.Keypair.generate(),
  ];
  let mint_x: web3.PublicKey;
  let maker_ata: Account;
  let donor1_ata: Account;
  let donor2_ata: Account;
  let escrow_ata: web3.PublicKey;
  let escrow: web3.PublicKey;
  const targetAmount = new anchor.BN(100000000);
  it("Airdrop", async () => {
    await Promise.all(
      [maker, donor1, donor2].map(async (k) => {
        return await anchor
          .getProvider()
          .connection.requestAirdrop(
            k.publicKey,
            10 * anchor.web3.LAMPORTS_PER_SOL
          );
      })
    ).then(confirmTxs);
  });

  it("Setup!", async () => {
    // Mints
    mint_x = await createMint(connection, maker, maker.publicKey, null, 6);
    [escrow] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), maker.publicKey.toBuffer(), mint_x.toBuffer()],
      program.programId
    );
    maker_ata = await getOrCreateAssociatedTokenAccount(
      connection,
      maker,
      mint_x,
      maker.publicKey
    );

    donor1_ata = await getOrCreateAssociatedTokenAccount(
      connection,
      donor1,
      mint_x,
      donor1.publicKey
    );

    donor2_ata = await getOrCreateAssociatedTokenAccount(
      connection,
      donor2,
      mint_x,
      donor2.publicKey
    );

    escrow_ata = await getAssociatedTokenAddress(mint_x, escrow, true);
    await mintTo(
      connection,
      maker,
      mint_x,
      donor1_ata.address,
      maker,
      100 * 10 ** 6,
      [],
      {
        commitment: "confirmed",
      }
    );

    expect(
      await connection.getTokenAccountBalance(donor1_ata.address, commitment)
    )
      .to.have.property("value")
      .has.property("amount")
      .eq((100 * 10 ** 6).toString());

    await mintTo(
      connection,
      maker,
      mint_x,
      donor2_ata.address,
      maker,
      500 * 10 ** 6,
      [],
      {
        commitment: "confirmed",
      }
    );

    expect(
      await connection.getTokenAccountBalance(donor2_ata.address, commitment)
    )
      .to.have.property("value")
      .has.property("amount")
      .eq((500 * 10 ** 6).toString());
  });

  it("Make escrow", async () => {
    const tx = await program.methods
      .make(targetAmount)
      .accounts({
        maker: maker.publicKey,
        mint: mint_x,
        makerAta: maker_ata.address,
        escrow: escrow,
        escrowAta: escrow_ata,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([maker])
      .rpc();
    confirmTx(tx);
  });

  it("Donate", async () => {
    const tx1 = await program.methods
      .donate(new anchor.BN(10 * 10 ** 6))
      .accounts({
        donor: donor1.publicKey,
        mint: mint_x,
        maker: maker.publicKey,
        escrow: escrow,
        escrowAta: escrow_ata,
        donorAta: donor1_ata.address,
        makerAta: maker_ata.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([donor1])
      .rpc({
        commitment: "confirmed",
      });
    confirmTx(tx1);

    const tx2 = await program.methods
      .donate(new anchor.BN(50 * 10 ** 6))
      .accounts({
        donor: donor2.publicKey,
        mint: mint_x,
        maker: maker.publicKey,
        escrow: escrow,
        escrowAta: escrow_ata,
        donorAta: donor2_ata.address,
        makerAta: maker_ata.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([donor2])
      .rpc({
        commitment: "confirmed",
      });
    confirmTx(tx2);

    expect(await connection.getTokenAccountBalance(escrow_ata, commitment))
      .to.have.property("value")
      .has.property("amount")
      .eq((60 * 10 ** 6).toString());
  });

  it("Should not withdraw when target not met", async () => {
    try {
      await program.methods
        .withdraw()
        .accounts({
          maker: maker.publicKey,
          mint: mint_x,
          escrow: escrow,
          escrowAta: escrow_ata,
          makerAta: maker_ata.address,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
        })
        .signers([maker])
        .rpc();
    } catch (error) {
      expect(error).to.be.instanceOf(AnchorError);
      expect((error as AnchorError).error.errorCode.code).to.equal(
        "TargetNotReached"
      );
      expect((error as AnchorError).error.errorMessage).to.equal(
        "The target has not been reached"
      );
    }
  });

  it("Donate to meet target", async () => {
    const tx = await program.methods
      .donate(new anchor.BN(100 * 10 ** 6))
      .accounts({
        donor: donor1.publicKey,
        mint: mint_x,
        maker: maker.publicKey,
        escrow: escrow,
        escrowAta: escrow_ata,
        donorAta: donor1_ata.address,
        makerAta: maker_ata.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([donor1])
      .rpc({
        commitment: "confirmed",
      });
    confirmTx(tx);
  });

  it("Withdraw", async () => {
    const tx = await program.methods
      .withdraw()
      .accounts({
        maker: maker.publicKey,
        mint: mint_x,
        escrow: escrow,
        escrowAta: escrow_ata,
        makerAta: maker_ata.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([maker])
      .rpc({
        commitment: "confirmed",
      });
    confirmTx(tx);

    // expect(await connection.getTokenAccountBalance(escrow_ata, commitment))
    //   .to.have.property("value")
    //   .has.property("amount")
    //   .eq("0");

    expect(
      await connection.getTokenAccountBalance(maker_ata.address, commitment)
    )
      .to.have.property("value")
      .has.property("amount")
      .eq(targetAmount.toString());
  });
});
