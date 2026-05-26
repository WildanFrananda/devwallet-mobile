import { injectable } from "tsyringe"
import { HDKey } from "@scure/bip32"
import Bip39 from "../bip39"
import { Chain } from "../../constants/chains.enum"
import Account from "../../../models/account.model"
import EvmDeriver from "../derivers/evm.deriver"
import BitcoinDeriver from "../derivers/bitcoin.deriver"
import SolanaDeriver from "../derivers/solana.deriver"

/**
 * Holds the HD root + BIP39 seed in-memory and dispatches per-chain
 * derivation. Mnemonic stays in memory only until clear() — Phase 1 will
 * plug Keychain persistence on top, but this service never writes the
 * seed itself.
 */
@injectable()
class KeyringService {
  private root: HDKey | null = null
  private seed: Uint8Array | null = null

  public loadMnemonic(mnemonic: string, passphrase: string = ""): void {
    const seed = Bip39.toSeed(mnemonic, passphrase)
    this.seed = seed
    this.root = HDKey.fromMasterSeed(seed)
  }

  public clear(): void {
    this.root = null
    this.seed = null
  }

  public isUnlocked(): boolean {
    return this.root !== null && this.seed !== null
  }

  public deriveAccount(chain: Chain, addressIndex: number = 0): Account {
    if (!this.root || !this.seed) {
      throw new Error("Keyring locked — call loadMnemonic() first")
    }

    if (KeyringService.isEvm(chain)) {
      return EvmDeriver.derive(this.root, chain, addressIndex)
    }
    if (chain === Chain.BITCOIN_TESTNET) {
      return BitcoinDeriver.derive(this.root, addressIndex)
    }
    if (chain === Chain.SOLANA_DEVNET) {
      return SolanaDeriver.derive(this.seed, addressIndex)
    }

    throw new Error(`deriveAccount: chain ${chain} not implemented yet`)
  }

  public deriveEvmAll(addressIndex: number = 0): Account[] {
    return KeyringService.EVM_CHAINS.map(chain => this.deriveAccount(chain, addressIndex))
  }

  public deriveSupportedAll(addressIndex: number = 0): Account[] {
    return KeyringService.SUPPORTED_CHAINS.map(chain => this.deriveAccount(chain, addressIndex))
  }

  private static readonly EVM_CHAINS: ReadonlyArray<Chain> = [
    Chain.EVM_SEPOLIA,
    Chain.EVM_HOLESKY,
    Chain.EVM_POLYGON_AMOY,
    Chain.EVM_BASE_SEPOLIA,
    Chain.EVM_LOCAL
  ]

  private static readonly SUPPORTED_CHAINS: ReadonlyArray<Chain> = [
    ...KeyringService.EVM_CHAINS,
    Chain.BITCOIN_TESTNET,
    Chain.SOLANA_DEVNET
  ]

  private static isEvm(chain: Chain): boolean {
    return KeyringService.EVM_CHAINS.includes(chain)
  }
}

export default KeyringService
