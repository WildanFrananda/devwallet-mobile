import { Injectable } from "react-native-mobile-mvvm/di"
import { HDKey } from "@scure/bip32"
import Bip39 from "../bip39"
import { Chain } from "../../constants/chains.enum"
import Account from "../../../models/account.model"
import type { ChainDeriver, DerivationContext } from "../derivers/chain-deriver.interface"
import EvmDeriver from "../derivers/evm.deriver"
import BitcoinDeriver from "../derivers/bitcoin.deriver"
import SolanaDeriver from "../derivers/solana.deriver"
import CosmosDeriver from "../derivers/cosmos.deriver"
import XrplDeriver from "../derivers/xrpl.deriver"
import StarknetDeriver from "../derivers/starknet.deriver"

/**
 * Strategy-pattern dispatcher: holds the HD root + BIP39 seed + mnemonic in
 * memory and delegates derivation to whichever ChainDeriver claims support
 * for the requested chain. Add a new chain by appending a new deriver to
 * the list — no method here changes.
 */
@Injectable()
class KeyringService {
  private root: HDKey | null = null
  private seed: Uint8Array | null = null
  private mnemonic: string | null = null

  private readonly derivers: ReadonlyArray<ChainDeriver> = [
    new EvmDeriver(),
    new BitcoinDeriver(),
    new SolanaDeriver(),
    new CosmosDeriver(),
    new XrplDeriver(),
    new StarknetDeriver()
  ]

  private static readonly SUPPORTED_CHAINS: ReadonlyArray<Chain> = [
    Chain.EVM_SEPOLIA,
    Chain.EVM_POLYGON_AMOY,
    Chain.EVM_BASE_SEPOLIA,
    Chain.BITCOIN_TESTNET,
    Chain.SOLANA_DEVNET,
    Chain.COSMOS_THETA,
    Chain.XRPL_TESTNET,
    Chain.STARKNET_SEPOLIA
  ]

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

  public getMnemonic(): string {
    if (!this.mnemonic) {
      throw new Error("Keyring locked — no mnemonic in memory")
    }
    return this.mnemonic
  }

  public async deriveAccount(chain: Chain, addressIndex: number = 0): Promise<Account> {
    const ctx = this.context()
    const deriver = this.derivers.find(d => d.supports(chain))
    if (!deriver) {
      throw new Error(`No deriver registered for chain ${chain}`)
    }
    return deriver.derive(ctx, chain, addressIndex)
  }

  public async deriveEvmAll(addressIndex: number = 0): Promise<Account[]> {
    const evm = KeyringService.SUPPORTED_CHAINS.filter(c => c.startsWith("evm:"))
    return Promise.all(evm.map(chain => this.deriveAccount(chain, addressIndex)))
  }

  public async deriveSupportedAll(addressIndex: number = 0): Promise<Account[]> {
    return Promise.all(KeyringService.SUPPORTED_CHAINS.map(chain => this.deriveAccount(chain, addressIndex)))
  }

  private context(): DerivationContext {
    if (!this.root || !this.seed || !this.mnemonic) {
      throw new Error("Keyring locked — call loadMnemonic() first")
    }
    return { root: this.root, seed: this.seed, mnemonic: this.mnemonic }
  }
}

export default KeyringService
