import { grindKey } from "@scure/starknet"
import { bytesToHex, type Hex } from "viem"
import { hash, CallData, ec } from "starknet"
import Bip44Paths from "../bip44"
import { Chain } from "../../constants/chains.enum"
import Account from "../../../models/account.model"
import type { ChainDeriver, DerivationContext } from "./chain-deriver.interface"

// OpenZeppelin Cairo Account v0.18.0 — pinned per Phase 3 spec §2.1.
// Verify on starkscan if the OZ version is bumped.
const OZ_ACCOUNT_CLASS_HASH = "0x05400e90f7e0ae78bd02c77cd75527280470e2fe19c54970dd79dc37a9d3645c"

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
    // `getStarkKey` returns the x-coordinate as a hex string — the Stark
    // felt252-friendly form Cairo contracts accept as a single argument.
    const publicKey = ec.starkCurve.getStarkKey(privateKey) as Hex

    // Deterministic OZ Account contract address from public key. Same key
    // pair always lands on the same address, so the faucet can prefund the
    // account before the user pays for the deploy fee.
    const constructorCalldata = CallData.compile({ publicKey })
    const address = hash.calculateContractAddressFromHash(
      publicKey,
      OZ_ACCOUNT_CLASS_HASH,
      constructorCalldata,
      0
    ) as Hex

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
export { OZ_ACCOUNT_CLASS_HASH }
