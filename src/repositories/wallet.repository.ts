import Account from "../models/account.model"
import { Chain } from "../core/constants/chains.enum"

/**
 * Wallet ports — orchestrates KeyringService (in-memory HD root) +
 * KeychainService (secure-enclave persistence). Phase 1 surface only;
 * Phase 2+ will plug session keepalive + multi-account.
 */
abstract class WalletRepository {
  public abstract hasWallet(): Promise<boolean>

  /** Create wallet from a freshly-generated mnemonic. */
  public abstract createFromMnemonic(mnemonic: string, requireBiometric?: boolean): Promise<Account>

  /** Restore wallet from a user-supplied mnemonic. */
  public abstract restore(mnemonic: string, requireBiometric?: boolean): Promise<Account>

  /** Read mnemonic from keychain (biometric prompt) and load keyring. */
  public abstract unlock(promptMessage?: string): Promise<Account>

  /** Returns the primary EVM Sepolia account when keyring is unlocked. */
  public abstract getCurrent(): Promise<Account>

  /** Derive every supported chain at address index 0. */
  public abstract deriveAll(addressIndex?: number): Promise<Account[]>

  /** Derive a single chain at the given index. */
  public abstract derive(chain: Chain, addressIndex?: number): Promise<Account>

  /** Wipe keychain + in-memory keyring. */
  public abstract clear(): Promise<void>

  /** Whether the in-memory keyring is currently loaded. */
  public abstract isUnlocked(): boolean
}

export default WalletRepository
