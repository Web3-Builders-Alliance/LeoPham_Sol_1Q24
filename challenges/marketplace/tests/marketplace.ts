import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Marketplace } from "../target/types/marketplace";
import { Commitment, Connection, Keypair } from "@solana/web3.js";
import {
  Metaplex,
  keypairIdentity,
  bundlrStorage,
} from "@metaplex-foundation/js";
const keypair = new Keypair();

describe("marketplace", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Marketplace as Program<Marketplace>;
  const connection = new Connection(
    "http://localhost:8899",
    "confirmed" as Commitment
  );
  const metaplex = Metaplex.make(connection).use(keypairIdentity(keypair));

  xit("Mints some NFTs", async () => {
    //Create a Solana devnet connection

    (async () => {
      try {
        const { nft } = await metaplex.nfts().create({
          uri: "https://arweave.net/Yc3-kYpvryr9_cYk-AVZzJ78GEXbj5bLLHJV0Fb35D4",
          name: "Generug #1",
          sellerFeeBasisPoints: 420,
          symbol: "RUG",
          creators: [
            {
              address: keypair.publicKey,
              share: 100,
            },
          ],
          isMutable: true,
        });
        console.log(
          `Success! Check out your NFT here:\nhttps://explorer.solana.com/address/${nft.address}?cluster=devnet`
        );
      } catch (e) {
        console.error(`Oops, something went wrong: ${e}`);
      }
    })();
  });
});
