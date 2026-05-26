import { Wallet } from "xrpl"
import type { Hex } from "viem"
import Bip44Paths from "../bip44"
import { Chain } from "../../constants/chains.enum"
import Account from "../../../models/account.model"

class XrplDeriver {
  /**
   * XRPL classic address (`r...`) at BIP44 path m/44'/144'/0'/0/0.
   * Uses xrpl.js secp256k1 derivation (Ledger-compatible).
   */
  public static derive(mnemonic: string, addressIndex: number = 0): Account {
    const path = Bip44Paths.path(Chain.XRPL_TESTNET, addressIndex)
    const wallet = Wallet.fromMnemonic(mnemonic, {
      derivationPath: path,
      mnemonicEncoding: "bip39"
    })

    const privateKey: Hex = (wallet.privateKey.startsWith("0x") ? wallet.privateKey : `0x${wallet.privateKey}`) as Hex
    const publicKey: Hex = (wallet.publicKey.startsWith("0x") ? wallet.publicKey : `0x${wallet.publicKey}`) as Hex

    return new Account({
      chain: Chain.XRPL_TESTNET,
      address: wallet.classicAddress,
      privateKey,
      publicKey,
      path,
      index: addressIndex
    })
  }
}

export default XrplDeriver
