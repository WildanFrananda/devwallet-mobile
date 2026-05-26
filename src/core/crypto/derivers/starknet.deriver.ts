import { grindKey, getPublicKey } from "@scure/starknet"
import { Buffer } from "buffer"
import { bytesToHex, type Hex } from "viem"
import Bip44Paths from "../bip44"
import { Chain } from "../../constants/chains.enum"
import Account from "../../../models/account.model"
import type { ChainDeriver, DerivationContext } from "./chain-deriver.interface"

class StarknetDeriver implements ChainDeriver {
  public supports(chain: Chain): boolean {
    return chain === Chain.STARKNET_SEPOLIA
  }

  public derive(ctx: DerivationContext, _chain: Chain, addressIndex: number): Promise<Account> {
    const path = Bip44Paths.path(Chain.STARKNET_SEPOLIA, addressIndex)
    const child = ctx.root.derive(path)
    if (!child.privateKey) {
      throw new Error(`StarkNet derivation failed at ${path}`)
    }

    const seedHex = bytesToHex(child.privateKey).slice(2)
    const grindedHex = grindKey(seedHex)
    const privateKey: Hex = `0x${grindedHex}`
    const publicKey: Hex = `0x${Buffer.from(getPublicKey(grindedHex)).toString("hex")}`

    // Phase 1 placeholder: account contract address (Argent/Braavos OZ) is
    // computed at deploy time. Surface stark pubkey as the "address" for now.
    const address = publicKey

    return Promise.resolve(
      new Account({
        chain: Chain.STARKNET_SEPOLIA,
        address,
        privateKey,
        publicKey,
        path,
        index: addressIndex
      })
    )
  }
}

export default StarknetDeriver
