import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing"
import { stringToPath } from "@cosmjs/crypto"
import { bytesToHex, type Hex } from "viem"
import Bip44Paths from "../bip44"
import { Chain } from "../../constants/chains.enum"
import Account from "../../../models/account.model"
import type { ChainDeriver, DerivationContext } from "./chain-deriver.interface"

class CosmosDeriver implements ChainDeriver {
  public supports(chain: Chain): boolean {
    return chain === Chain.COSMOS_THETA
  }

  public async derive(ctx: DerivationContext, _chain: Chain, addressIndex: number): Promise<Account> {
    const path = Bip44Paths.path(Chain.COSMOS_THETA, addressIndex)
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(ctx.mnemonic, {
      prefix: "cosmos",
      hdPaths: [stringToPath(path)]
    })

    const [accountInfo] = await wallet.getAccounts()
    if (!accountInfo) {
      throw new Error(`Cosmos derivation produced no account at ${path}`)
    }

    const publicKey: Hex = bytesToHex(accountInfo.pubkey)
    // Private key stays inside cosmjs wallet; signing goes through it later.
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
