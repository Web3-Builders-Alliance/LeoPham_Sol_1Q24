import wallet from "../wba-wallet.json";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createGenericFile,
  createSignerFromKeypair,
  signerIdentity,
} from "@metaplex-foundation/umi";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { readFile } from "fs/promises";

// Create a devnet connection
const umi = createUmi("https://api.devnet.solana.com");

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(irysUploader());
umi.use(signerIdentity(signer));

(async () => {
  try {
    //1. Load image
    //2. Convert image to generic file.
    //3. Upload image

    const image = await readFile(
      "/Users/leo/Desktop/wba/LeoPham_Sol_1Q24/challenges/solana-starter/ts/images/generug.png"
    );

    const [myUri] = await umi.uploader.upload([
      createGenericFile(image, "generug", {
        contentType: "image/png",
      }),
    ]);
    console.log("Your image sURI: ", myUri);
  } catch (error) {
    console.log("Oops.. Something went wrong", error);
  }
})();
