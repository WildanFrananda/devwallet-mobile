import Account from "../models/account.model"
import Portfolio from "../models/portfolio.model"
import Token from "../models/token.model"
import Transaction from "../models/transaction.model"
import SendDraft from "../models/send-draft.model"
import { Chain } from "../core/constants/chains.enum"

/**
 * Wallet ports — orchestrates KeyringService (in-memory HD root) +
 * KeychainService (secure-enclave persistence) + BalanceDatasource
 * (per-chain native balance fetch).
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

  /**
   * Derive every supported account at the given index then fetch native
   * balance for each in parallel. Returns a Portfolio with per-account
   * success/error entries — never throws for individual chain failures.
   */
  public abstract loadPortfolio(addressIndex?: number): Promise<Portfolio>

  /** Fetch ERC-20 / SPL token balances for a single account. */
  public abstract loadTokens(chain: Chain, address: string): Promise<Token[]>

  /** Fetch the most recent transactions for a single account. */
  public abstract loadTxHistory(chain: Chain, address: string, limit?: number): Promise<Transaction[]>

  /**
   * Sign + broadcast a transaction using the keyring's private key for the
   * draft's chain + sender. Returns the broadcast hash immediately;
   * confirmation is polled separately via `waitForConfirmation`.
   */
  public abstract sendTx(draft: SendDraft): Promise<{ hash: string }>

  /** Wait for the receipt on-chain. */
  public abstract waitForConfirmation(chain: Chain, hash: string): Promise<Transaction>

  /** Wipe keychain + in-memory keyring. */
  public abstract clear(): Promise<void>

  /** Whether the in-memory keyring is currently loaded. */
  public abstract isUnlocked(): boolean
}

export default WalletRepository
