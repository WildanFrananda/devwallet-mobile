import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import { EventFlow, StateFlow, UiState, ViewModel } from "react-native-mobile-mvvm"
import PinService from "../core/auth/pin.service"
import WalletRepository from "../repositories/wallet.repository"
import { Tokens } from "../core/di/tokens"

type Stage = "create" | "confirm"

@Injectable()
class PinSetupViewModel extends ViewModel {
  private readonly _stage = new StateFlow<Stage>("create")
  private readonly _createValue = new StateFlow<string>("")
  private readonly _confirmValue = new StateFlow<string>("")
  private readonly _save = new StateFlow<UiState<void>>(UiState.idle())
  private readonly _saved = new EventFlow<void>()

  public readonly stage$ = this._stage.asReadOnly()
  public readonly createValue$ = this._createValue.asReadOnly()
  public readonly confirmValue$ = this._confirmValue.asReadOnly()
  public readonly save$ = this._save.asReadOnly()
  public readonly saved$ = this._saved.asObservable()

  public constructor(
    @Inject(Tokens.Pin) private readonly pin: PinService,
    @Inject(Tokens.WalletRepository) private readonly wallet: WalletRepository
  ) {
    super()
  }

  public setCreateValue(value: string): void {
    this._createValue.value = PinSetupViewModel.sanitize(value)
    if (this._save.value.status === "error") this._save.value = UiState.idle()
  }

  public setConfirmValue(value: string): void {
    this._confirmValue.value = PinSetupViewModel.sanitize(value)
    if (this._save.value.status === "error") this._save.value = UiState.idle()
  }

  public advanceToConfirm(): void {
    if (!PinSetupViewModel.isValid(this._createValue.value)) {
      this._save.value = UiState.error("Enter exactly 6 digits")
      return
    }
    this._stage.value = "confirm"
  }

  public back(): void {
    this._stage.value = "create"
    this._confirmValue.value = ""
    this._save.value = UiState.idle()
  }

  public submit(): void {
    if (this._createValue.value !== this._confirmValue.value) {
      this._save.value = UiState.error("PINs do not match")
      return
    }
    this._save.value = UiState.loading()
    void this.launch(async signal => {
      try {
        const pinValue = this._createValue.value
        await this.pin.setPin(pinValue)
        if (signal.aborted) return
        // Now that the PIN is in keychain, encrypt + persist the
        // mnemonic that onboarding has been holding in-memory. This is
        // the only place the wallet writes to keychain, so we never
        // produce a plaintext mnemonic row.
        await this.wallet.persistEncrypted(pinValue)
        if (signal.aborted) return
        this._save.value = UiState.success(undefined)
        this._saved.emit()
      } catch (err) {
        if (signal.aborted) return
        this._save.value = UiState.error(err instanceof Error ? err.message : String(err))
      }
    })
  }

  private static sanitize(value: string): string {
    return value.replace(/\D/g, "").slice(0, 6)
  }

  private static isValid(value: string): boolean {
    return /^\d{6}$/.test(value)
  }
}

export default PinSetupViewModel
