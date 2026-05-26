import { HDKey } from "@scure/bip32"
import * as bitcoin from "bitcoinjs-lib"
import ecc from "@bitcoinerlab/secp256k1"
import { Buffer } from "buffer"
import { bytesToHex, type Hex } from "viem"
import Bip44Paths from "../bip44"
import { Chain } from "../../constants/chains.enum"
import Account from "../../../models/account.model"

let eccReady = false

class BitcoinDeriver {
  private static ensureEcc(): void {
    if (eccReady) return
    bitcoin.initEccLib(ecc)
    eccReady = true
  }

  /**
   * Native segwit (P2WPKH, `tb1q...`) at BIP84 path. Mainnet not supported in
   * Phase 1 (testnet only).
   */
  public static derive(root: HDKey, addressIndex: number = 0): Account {
    BitcoinDeriver.ensureEcc()

    const path = Bip44Paths.path(Chain.BITCOIN_TESTNET, addressIndex)
    const child = root.derive(path)
    if (!child.privateKey || !child.publicKey) {
      throw new Error(`Bitcoin derivation failed at ${path}`)
    }

    const { address } = bitcoin.payments.p2wpkh({
      pubkey: Buffer.from(child.publicKey),
      network: bitcoin.networks.testnet
    })
    if (!address) {
      throw new Error("Bitcoin p2wpkh produced no address")
    }

    const privateKey: Hex = bytesToHex(child.privateKey)
    const publicKey: Hex = bytesToHex(child.publicKey)

    return new Account({
      chain: Chain.BITCOIN_TESTNET,
      address,
      privateKey,
      publicKey,
      path,
      index: addressIndex
    })
  }
}

export default BitcoinDeriver
