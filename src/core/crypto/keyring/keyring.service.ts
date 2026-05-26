import { injectable } from "tsyringe"
import { HDKey } from "@scure/bip32"
import { privateKeyToAccount } from "viem/accounts"
import { bytesToHex, type Hex } from "viem"
import Bip39 from "../bip39"
import Bip44Paths from "../bip44"
import { Chain } from "../../constants/chains.enum"
import Account from "../../../models/account.model"

/**
 * Holds the HD root in-memory and derives per-chain accounts on demand.
 * Mnemonic stays in memory only until clear() — Phase 1 will plug Keychain
 * persistence on top, but this service never writes the seed itself.
 */
@injectable()
class KeyringService {
  private root: HDKey | null = null

  public loadMnemonic(mnemonic: string, passphrase: string = ""): void {
    const seed = Bip39.toSeed(mnemonic, passphrase)
    this.root = HDKey.fromMasterSeed(seed)
  }

  public clear(): void {
    this.root = null
  }

  public isUnlocked(): boolean {
    return this.root !== null
  }

  public deriveAccount(chain: Chain, addressIndex: number = 0): Account {
    if (!this.root) {
      throw new Error("Keyring locked — call loadMnemonic() first")
    }
    if (!KeyringService.isEvm(chain)) {
      throw new Error(`deriveAccount: chain ${chain} not implemented yet (EVM only in Phase 1 Day 2)`)
    }

    const path = Bip44Paths.path(chain, addressIndex)
    const child = this.root.derive(path)

    if (!child.privateKey || !child.publicKey) {
      throw new Error(`Derivation failed at ${path}`)
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

  public deriveEvmAll(addressIndex: number = 0): Account[] {
    return KeyringService.EVM_CHAINS.map(chain => this.deriveAccount(chain, addressIndex))
  }

  private static readonly EVM_CHAINS: ReadonlyArray<Chain> = [
    Chain.EVM_SEPOLIA,
    Chain.EVM_HOLESKY,
    Chain.EVM_POLYGON_AMOY,
    Chain.EVM_BASE_SEPOLIA,
    Chain.EVM_LOCAL
  ]

  private static isEvm(chain: Chain): boolean {
    return KeyringService.EVM_CHAINS.includes(chain)
  }
}

export default KeyringService
