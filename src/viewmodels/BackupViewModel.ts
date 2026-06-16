import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import { StateFlow, UiState, ViewModel } from "react-native-mobile-mvvm"
import PinService from "../core/auth/pin.service"
import KeychainService from "../core/storage/keychain.service"
import SecureStorageService from "../core/auth/secure-storage.service"
import WalletRepository from "../repositories/wallet.repository"
import type Account from "../models/account.model"
import { Tokens } from "../core/di/tokens"

/** Plaintext secrets revealed after a successful PIN re-auth. Never persisted. */
type Reveal = {
  words: ReadonlyArray<string>
  accounts: ReadonlyArray<Account>
}

@Injectable()
class BackupViewModel extends ViewModel {
  private readonly _reveal = new StateFlow<UiState<Reveal>>(UiState.idle())
  public readonly reveal$ = this._reveal.asReadOnly()

  public constructor(
    @Inject(Tokens.Pin) private readonly pin: PinService,
    @Inject(Tokens.Keychain) private readonly keychain: KeychainService,
    @Inject(Tokens.SecureStorage) private readonly secure: SecureStorageService,
    @Inject(Tokens.WalletRepository) private readonly wallet: WalletRepository
  ) {
    super()
  }

  /**
   * Re-authenticate with the PIN, then surface the recovery phrase + every
   * chain's private key. Requires the live PIN even though the app is already
   * unlocked — secrets should never render without a deliberate re-auth.
   */
  public reveal(pin: string): void {
    this._reveal.value = UiState.loading()
    void this.launch(async signal => {
      try {
        const ok = await this.pin.verifyPin(pin)
        if (signal.aborted) return
        if (!ok) {
          this._reveal.value = UiState.error("Incorrect PIN.")
          return
        }
        const blob = await this.keychain.getMnemonic("Reveal your recovery phrase")
        if (signal.aborted) return
        if (blob === null) {
          this._reveal.value = UiState.error("Could not read the keychain.")
          return
        }
        const mnemonic = this.secure.isEncryptedBlob(blob) ? this.secure.decrypt(blob, pin) : blob
        const accounts = await this.wallet.deriveAll()
        if (signal.aborted) return
        this._reveal.value = UiState.success({ words: mnemonic.trim().split(/\s+/), accounts })
      } catch (err) {
        if (signal.aborted) return
        this._reveal.value = UiState.error(err instanceof Error ? err.message : String(err))
      }
    })
  }

  /** Drop revealed secrets from memory (call on screen unmount / hide). */
  public hide(): void {
    this._reveal.value = UiState.idle()
  }
}

export default BackupViewModel
export type { Reveal }
