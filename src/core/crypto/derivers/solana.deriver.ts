import { derivePath } from "ed25519-hd-key"
import { Keypair } from "@solana/web3.js"
import { bytesToHex, type Hex } from "viem"
import Bip44Paths from "../bip44"
import { Chain } from "../../constants/chains.enum"
import Account from "../../../models/account.model"

class SolanaDeriver {
  /**
   * Ed25519 SLIP-0010 derivation. Uses hardened-only path `m/44'/501'/N'/0'`
   * (Phantom + Solflare convention).
   */
  public static derive(seed: Uint8Array, addressIndex: number = 0): Account {
    const path = Bip44Paths.hardenedPath(Chain.SOLANA_DEVNET, addressIndex)
    const seedHex = bytesToHex(seed).slice(2)
    const { key } = derivePath(path, seedHex)
    const keypair = Keypair.fromSeed(new Uint8Array(key))

    const privateKey: Hex = bytesToHex(keypair.secretKey)
    const publicKey: Hex = bytesToHex(keypair.publicKey.toBytes())

    return new Account({
      chain: Chain.SOLANA_DEVNET,
      address: keypair.publicKey.toBase58(),
      privateKey,
      publicKey,
      path,
      index: addressIndex
    })
  }
}

export default SolanaDeriver
