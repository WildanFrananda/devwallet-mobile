import { privateKeyToAccount } from "viem/accounts"
import { bytesToHex, type Hex } from "viem"
import Bip44Paths from "../bip44"
import { Chain } from "../../constants/chains.enum"
import Account from "../../../models/account.model"
import type { ChainDeriver, DerivationContext } from "./chain-deriver.interface"

class EvmDeriver implements ChainDeriver {
  private static readonly EVM_CHAINS: ReadonlyArray<Chain> = [
    Chain.EVM_SEPOLIA,
    Chain.EVM_HOLESKY,
    Chain.EVM_POLYGON_AMOY,
    Chain.EVM_BASE_SEPOLIA,
    Chain.EVM_LOCAL
  ]

  public supports(chain: Chain): boolean {
    return EvmDeriver.EVM_CHAINS.includes(chain)
  }

  public derive(ctx: DerivationContext, chain: Chain, addressIndex: number): Promise<Account> {
    const path = Bip44Paths.path(chain, addressIndex)
    const child = ctx.root.derive(path)
    if (!child.privateKey || !child.publicKey) {
      throw new Error(`EVM derivation failed at ${path}`)
    }

    const privateKey: Hex = bytesToHex(child.privateKey)
    const publicKey: Hex = bytesToHex(child.publicKey)
    const viemAccount = privateKeyToAccount(privateKey)

    return Promise.resolve(
      new Account({
        chain,
        address: viemAccount.address,
        privateKey,
        publicKey,
        path,
        index: addressIndex
      })
    )
  }
}

export default EvmDeriver
