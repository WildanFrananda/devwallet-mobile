import { HDKey } from "@scure/bip32"
import { grindKey, getPublicKey } from "@scure/starknet"
import { bytesToHex, type Hex } from "viem"
import Bip44Paths from "../bip44"
import { Chain } from "../../constants/chains.enum"
import Account from "../../../models/account.model"

class StarknetDeriver {
  /**
   * StarkNet derivation:
   *   1. BIP32 derive secp256k1 child key at m/44'/9004'/0'/0/0.
   *   2. grindKey(rawSeed) — rejection-sample into the STARK curve order
   *      (STARK curve order < secp256k1, so a raw secp seed isn't always
   *      a valid Stark private key).
   *   3. starkCurve.getPublicKey for the address. Phase 1 surfaces the
   *      grinded private key as the "address" hex — the on-chain account
   *      contract address (Argent/Braavos) is computed at deploy time and
   *      stored separately by the wallet repository (Phase 1 Day 5+).
   */
  public static derive(root: HDKey, addressIndex: number = 0): Account {
    const path = Bip44Paths.path(Chain.STARKNET_SEPOLIA, addressIndex)
    const child = root.derive(path)
    if (!child.privateKey) {
      throw new Error(`StarkNet derivation failed at ${path}`)
    }

    const seedHex = bytesToHex(child.privateKey).slice(2)
    const grindedHex = grindKey(seedHex)
    const privateKey: Hex = `0x${grindedHex}`
    const publicKey: Hex = `0x${Buffer.from(getPublicKey(grindedHex)).toString("hex")}`

    // Phase 1 placeholder: address = stark pubkey. Account contract address
    // (Argent/Braavos OZ) gets computed when the wallet is deployed.
    const address = publicKey

    return new Account({
      chain: Chain.STARKNET_SEPOLIA,
      address,
      privateKey,
      publicKey,
      path,
      index: addressIndex
    })
  }
}

export default StarknetDeriver
