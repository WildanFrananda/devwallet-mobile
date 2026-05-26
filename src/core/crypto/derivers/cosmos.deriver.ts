import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing"
import { stringToPath } from "@cosmjs/crypto"
import { bytesToHex, type Hex } from "viem"
import Bip44Paths from "../bip44"
import { Chain } from "../../constants/chains.enum"
import Account from "../../../models/account.model"

class CosmosDeriver {
  /**
   * Cosmos Hub-style bech32 (`cosmos1...`) at standard BIP44 path
   * m/44'/118'/0'/0/0. Uses cosmjs DirectSecp256k1HdWallet — signing is
   * delegated to cosmjs at tx-build time, so we keep the wallet handle for
   * later phases but only expose the address + path here.
   */
  public static async derive(mnemonic: string, addressIndex: number = 0): Promise<Account> {
    const path = Bip44Paths.path(Chain.COSMOS_THETA, addressIndex)
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: "cosmos",
      hdPaths: [stringToPath(path)]
    })

    const [accountInfo] = await wallet.getAccounts()
    if (!accountInfo) {
      throw new Error(`Cosmos derivation produced no account at ${path}`)
    }

    const publicKey: Hex = bytesToHex(accountInfo.pubkey)
    // cosmjs intentionally hides the private key after construction; signing
    // is done via wallet.signDirect(). Phase 1 surfaces it as empty hex; the
    // signer service in Phase 1 Day 5 will swap to keeping the wallet ref.
    const privateKey: Hex = "0x"

    return new Account({
      chain: Chain.COSMOS_THETA,
      address: accountInfo.address,
      privateKey,
      publicKey,
      path,
      index: addressIndex
    })
  }
}

export default CosmosDeriver
