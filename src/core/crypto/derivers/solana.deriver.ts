import { derivePath } from "ed25519-hd-key"
import { Keypair } from "@solana/web3.js"
import { bytesToHex, type Hex } from "viem"
import Bip44Paths from "../bip44"
import { Chain } from "../../constants/chains.enum"
import Account from "../../../models/account.model"
import type { ChainDeriver, DerivationContext } from "./chain-deriver.interface"

class SolanaDeriver implements ChainDeriver {
  public supports(chain: Chain): boolean {
    return chain === Chain.SOLANA_DEVNET
  }

  public derive(ctx: DerivationContext, _chain: Chain, addressIndex: number): Promise<Account> {
    const path = Bip44Paths.hardenedPath(Chain.SOLANA_DEVNET, addressIndex)
    const seedHex = bytesToHex(ctx.seed).slice(2)
    const { key } = derivePath(path, seedHex)
    const keypair = Keypair.fromSeed(new Uint8Array(key))

    const privateKey: Hex = bytesToHex(keypair.secretKey)
    const publicKey: Hex = bytesToHex(keypair.publicKey.toBytes())

    return Promise.resolve(
      new Account({
        chain: Chain.SOLANA_DEVNET,
        address: keypair.publicKey.toBase58(),
        privateKey,
        publicKey,
        path,
        index: addressIndex
      })
    )
  }
}

export default SolanaDeriver
