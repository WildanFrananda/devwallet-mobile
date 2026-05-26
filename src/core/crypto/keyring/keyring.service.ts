import { injectable } from "tsyringe"
import { HDKey } from "@scure/bip32"
import Bip39 from "../bip39"
import { Chain } from "../../constants/chains.enum"
import Account from "../../../models/account.model"
import EvmDeriver from "../derivers/evm.deriver"
import BitcoinDeriver from "../derivers/bitcoin.deriver"
import SolanaDeriver from "../derivers/solana.deriver"
import CosmosDeriver from "../derivers/cosmos.deriver"
import XrplDeriver from "../derivers/xrpl.deriver"
import StarknetDeriver from "../derivers/starknet.deriver"

/**
 * Holds the HD root + BIP39 seed + mnemonic in-memory and dispatches per-chain
 * derivation. Cosmos derivation is async (cosmjs PBKDF2-based) so the whole
 * API is async. Mnemonic stays in memory only until clear() — Phase 1 will
 * plug Keychain persistence on top, but this service never writes the seed
 * itself.
 */
@injectable()
class KeyringService {
  private root: HDKey | null = null
  private seed: Uint8Array | null = null
  private mnemonic: string | null = null

  public loadMnemonic(mnemonic: string, passphrase: string = ""): void {
    const seed = Bip39.toSeed(mnemonic, passphrase)
    this.seed = seed
    this.root = HDKey.fromMasterSeed(seed)
    this.mnemonic = mnemonic
  }

  public clear(): void {
    this.root = null
    this.seed = null
    this.mnemonic = null
  }

  public isUnlocked(): boolean {
    return this.root !== null && this.seed !== null && this.mnemonic !== null
  }

  public async deriveAccount(chain: Chain, addressIndex: number = 0): Promise<Account> {
    if (!this.root || !this.seed || !this.mnemonic) {
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
    if (chain === Chain.COSMOS_THETA) {
      return CosmosDeriver.derive(this.mnemonic, addressIndex)
    }
    if (chain === Chain.XRPL_TESTNET) {
      return XrplDeriver.derive(this.mnemonic, addressIndex)
    }
    if (chain === Chain.STARKNET_SEPOLIA) {
      return StarknetDeriver.derive(this.root, addressIndex)
    }

    throw new Error(`deriveAccount: chain ${chain} not implemented yet`)
  }

  public async deriveEvmAll(addressIndex: number = 0): Promise<Account[]> {
    return Promise.all(KeyringService.EVM_CHAINS.map(chain => this.deriveAccount(chain, addressIndex)))
  }

  public async deriveSupportedAll(addressIndex: number = 0): Promise<Account[]> {
    return Promise.all(KeyringService.SUPPORTED_CHAINS.map(chain => this.deriveAccount(chain, addressIndex)))
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
    Chain.SOLANA_DEVNET,
    Chain.COSMOS_THETA,
    Chain.XRPL_TESTNET,
    Chain.STARKNET_SEPOLIA
  ]

  private static isEvm(chain: Chain): boolean {
    return KeyringService.EVM_CHAINS.includes(chain)
  }
}

export default KeyringService
