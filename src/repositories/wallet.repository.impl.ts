import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import WalletRepository from "./wallet.repository"
import KeyringService from "../core/crypto/keyring/keyring.service"
import KeychainService from "../core/storage/keychain.service"
import InstallMarker from "../core/storage/install-marker"
import PinService from "../core/auth/pin.service"
import DeviceBindingService from "../core/auth/device-binding.service"
import SecureStorageService from "../core/auth/secure-storage.service"
import BalanceDatasource from "../datasources/balance/balance.datasource"
import TokenDatasource from "../datasources/token/token.datasource"
import TxHistoryDatasource from "../datasources/tx-history/tx-history.datasource"
import SignerDatasource from "../datasources/signer/signer.datasource"
import Bip39 from "../core/crypto/bip39"
import { Chain } from "../core/constants/chains.enum"
import { Tokens } from "../core/di/tokens"
import Account from "../models/account.model"
import Portfolio from "../models/portfolio.model"
import Token from "../models/token.model"
import Transaction from "../models/transaction.model"
import SendDraft from "../models/send-draft.model"

@Injectable()
class WalletRepositoryImpl extends WalletRepository {
  public constructor(
    @Inject(Tokens.KeyringService) private readonly keyring: KeyringService,
    @Inject(Tokens.Keychain) private readonly keychain: KeychainService,
    @Inject(Tokens.BalanceDatasource) private readonly balances: BalanceDatasource,
    @Inject(Tokens.TokenDatasource) private readonly tokens: TokenDatasource,
    @Inject(Tokens.TxHistoryDatasource) private readonly txHistory: TxHistoryDatasource,
    @Inject(Tokens.SignerDatasource) private readonly signer: SignerDatasource,
    @Inject(Tokens.Pin) private readonly pin: PinService,
    @Inject(Tokens.DeviceBinding) private readonly deviceBinding: DeviceBindingService,
    @Inject(Tokens.SecureStorage) private readonly secureStorage: SecureStorageService
  ) {
    super()
  }

  public override async hasWallet(): Promise<boolean> {
    if (InstallMarker.isFreshInstall()) {
      await this.keychain.clear()
      InstallMarker.mark()
      return false
    }
    return this.keychain.hasMnemonic()
  }

  public override async createFromMnemonic(mnemonic: string): Promise<Account> {
    if (!Bip39.validate(mnemonic)) {
      throw new Error("Invalid mnemonic — failed BIP39 checksum")
    }
    this.keyring.loadMnemonic(mnemonic)
    return this.keyring.deriveAccount(Chain.EVM_SEPOLIA, 0)
  }

  public override async restore(mnemonic: string): Promise<Account> {
    return this.createFromMnemonic(mnemonic)
  }

  public override async persistEncrypted(pin: string): Promise<void> {
    if (!this.keyring.isUnlocked()) {
      throw new Error("Keyring locked — load mnemonic before persistEncrypted()")
    }
    const mnemonic = this.keyring.getMnemonic()
    const blob = this.secureStorage.encrypt(mnemonic, pin)
    // Write WITHOUT biometric ACL — the mnemonic row is already encrypted at
    // the app layer. Biometric protects the cached PIN row instead.
    await this.keychain.setMnemonic(blob, false)
    await this.keychain.setCachedPin(pin)
    await this.deviceBinding.bind()
  }

  public override async unlock(
    method: "biometric" | "pin" = "biometric",
    pinValue?: string,
    promptMessage: string = "Unlock wallet"
  ): Promise<Account> {
    await this.deviceBinding.verify()
    const pin = await this.resolvePin(method, pinValue, promptMessage)
    const blob = await this.keychain.getMnemonic(promptMessage)
    if (!blob) {
      throw new Error("No mnemonic in keychain (or user cancelled biometric)")
    }
    const mnemonic = this.decryptOrPassthrough(blob, pin)
    this.keyring.loadMnemonic(mnemonic)
    return this.keyring.deriveAccount(Chain.EVM_SEPOLIA, 0)
  }

  /**
   * Pre-Phase-3 wallets stored the raw mnemonic in the keychain — those
   * rows fall through `isEncryptedBlob === false` and we return the value
   * unchanged. The migration service rewraps them on the next boot.
   */
  private decryptOrPassthrough(blob: string, pin: string): string {
    if (!this.secureStorage.isEncryptedBlob(blob)) return blob
    return this.secureStorage.decrypt(blob, pin)
  }

  private async resolvePin(
    method: "biometric" | "pin",
    pinValue: string | undefined,
    promptMessage: string
  ): Promise<string> {
    if (method === "pin") {
      if (!pinValue) throw new Error("PIN required")
      const ok = await this.pin.verifyPin(pinValue)
      if (!ok) throw new Error("Incorrect PIN")
      return pinValue
    }
    const cached = await this.keychain.getCachedPin(promptMessage)
    if (!cached) {
      throw new Error("Biometric PIN cache empty — set PIN first or unlock with PIN")
    }
    return cached
  }

  public override async getCurrent(): Promise<Account> {
    if (!this.keyring.isUnlocked()) {
      throw new Error("Keyring locked — call unlock() first")
    }
    return this.keyring.deriveAccount(Chain.EVM_SEPOLIA, 0)
  }

  public override async deriveAll(addressIndex: number = 0): Promise<Account[]> {
    if (!this.keyring.isUnlocked()) {
      throw new Error("Keyring locked — call unlock() first")
    }
    return this.keyring.deriveSupportedAll(addressIndex)
  }

  public override async derive(chain: Chain, addressIndex: number = 0): Promise<Account> {
    if (!this.keyring.isUnlocked()) {
      throw new Error("Keyring locked — call unlock() first")
    }
    return this.keyring.deriveAccount(chain, addressIndex)
  }

  public override async loadPortfolio(addressIndex: number = 0): Promise<Portfolio> {
    const accounts = await this.deriveAll(addressIndex)
    const entries = await this.balances.fetchMany(accounts)
    return new Portfolio(entries)
  }

  public override loadTokens(chain: Chain, address: string): Promise<Token[]> {
    return this.tokens.fetch(chain, address)
  }

  public override loadTxHistory(chain: Chain, address: string, limit: number = 25): Promise<Transaction[]> {
    return this.txHistory.fetch(chain, address, limit)
  }

  public override async sendTx(draft: SendDraft): Promise<{ hash: string }> {
    if (!this.keyring.isUnlocked()) {
      throw new Error("Keyring locked — call unlock() first")
    }
    const account = await this.keyring.deriveAccount(draft.chain, 0)
    if (account.address.toLowerCase() !== draft.fromAddress.toLowerCase()) {
      throw new Error("Draft fromAddress does not match derived account")
    }
    const secrets = { privateKey: account.privateKey, mnemonic: this.keyring.getMnemonic() }
    const { hash } = await this.signer.send(secrets, draft)
    return { hash }
  }

  public override waitForConfirmation(chain: Chain, hash: string): Promise<Transaction> {
    return this.signer.waitForConfirmation(chain, hash)
  }

  public override async clear(): Promise<void> {
    await this.keychain.clear()
    this.deviceBinding.clear()
    this.keyring.clear()
  }

  public override isUnlocked(): boolean {
    return this.keyring.isUnlocked()
  }

}

export default WalletRepositoryImpl
