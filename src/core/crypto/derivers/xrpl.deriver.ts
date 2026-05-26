import { Wallet } from "xrpl"
import type { Hex } from "viem"
import Bip44Paths from "../bip44"
import { Chain } from "../../constants/chains.enum"
import Account from "../../../models/account.model"
import type { ChainDeriver, DerivationContext } from "./chain-deriver.interface"

class XrplDeriver implements ChainDeriver {
  public supports(chain: Chain): boolean {
    return chain === Chain.XRPL_TESTNET
  }

  public derive(ctx: DerivationContext, _chain: Chain, addressIndex: number): Promise<Account> {
    const path = Bip44Paths.path(Chain.XRPL_TESTNET, addressIndex)
    const wallet = Wallet.fromMnemonic(ctx.mnemonic, {
      derivationPath: path,
      mnemonicEncoding: "bip39"
    })

    const privateKey: Hex = (wallet.privateKey.startsWith("0x") ? wallet.privateKey : `0x${wallet.privateKey}`) as Hex
    const publicKey: Hex = (wallet.publicKey.startsWith("0x") ? wallet.publicKey : `0x${wallet.publicKey}`) as Hex

    return Promise.resolve(
      new Account({
        chain: Chain.XRPL_TESTNET,
        address: wallet.classicAddress,
        privateKey,
        publicKey,
        path,
        index: addressIndex
      })
    )
  }
}

export default XrplDeriver
