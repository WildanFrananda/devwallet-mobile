import { HDKey } from "@scure/bip32"
import { privateKeyToAccount } from "viem/accounts"
import { bytesToHex, type Hex } from "viem"
import Bip44Paths from "../bip44"
import { Chain } from "../../constants/chains.enum"
import Account from "../../../models/account.model"

class EvmDeriver {
  public static derive(root: HDKey, chain: Chain, addressIndex: number = 0): Account {
    const path = Bip44Paths.path(chain, addressIndex)
    const child = root.derive(path)
    if (!child.privateKey || !child.publicKey) {
      throw new Error(`EVM derivation failed at ${path}`)
    }

    const privateKey: Hex = bytesToHex(child.privateKey)
    const publicKey: Hex = bytesToHex(child.publicKey)
    const viemAccount = privateKeyToAccount(privateKey)

    return new Account({
      chain,
      address: viemAccount.address,
      privateKey,
      publicKey,
      path,
      index: addressIndex
    })
  }
}

export default EvmDeriver
