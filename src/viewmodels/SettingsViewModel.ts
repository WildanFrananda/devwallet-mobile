import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import { StateFlow, UiState, ViewModel } from "react-native-mobile-mvvm"
import SettingsService from "../core/storage/settings.service"
import AutoLockService from "../core/lifecycle/auto-lock.service"
import PinService from "../core/auth/pin.service"
import KeychainService from "../core/storage/keychain.service"
import { Tokens } from "../core/di/tokens"

@Injectable()
class SettingsViewModel extends ViewModel {
  private readonly _autoLockMs = new StateFlow<number>(0)
  private readonly _useBiometric = new StateFlow<boolean>(true)
  private readonly _changePin = new StateFlow<UiState<void>>(UiState.idle())
  public readonly autoLockMs$ = this._autoLockMs.asReadOnly()
  public readonly useBiometric$ = this._useBiometric.asReadOnly()
  public readonly changePin$ = this._changePin.asReadOnly()

  public constructor(
    @Inject(Tokens.Settings) private readonly settings: SettingsService,
    @Inject(Tokens.AutoLock) private readonly autoLock: AutoLockService,
    @Inject(Tokens.Pin) private readonly pin: PinService,
    @Inject(Tokens.Keychain) private readonly keychain: KeychainService
  ) {
    super()
    this._autoLockMs.value = settings.getAutoLockMs()
    this._useBiometric.value = settings.getUseBiometric()
  }

  public setAutoLockMs(ms: number): void {
    this.settings.setAutoLockMs(ms)
    this.autoLock.setLockAfter(ms)
    this._autoLockMs.value = ms
  }

  public setUseBiometric(enabled: boolean): void {
    this.settings.setUseBiometric(enabled)
    this._useBiometric.value = enabled
    void this.launch(async signal => {
      try {
        await this.keychain.setBiometricRequired(enabled)
      } catch (err) {
        if (signal.aborted) return
        // Revert on failure so persisted UI matches keychain state.
        this.settings.setUseBiometric(!enabled)
        this._useBiometric.value = !enabled
        throw err
      }
    })
  }

  public changePin(oldPin: string, newPin: string): void {
    this._changePin.value = UiState.loading()
    void this.launch(async signal => {
      try {
        await this.pin.changePin(oldPin, newPin)
        if (signal.aborted) return
        this._changePin.value = UiState.success(undefined)
      } catch (err) {
        if (signal.aborted) return
        this._changePin.value = UiState.error(err instanceof Error ? err.message : String(err))
      }
    })
  }

  public resetChangePin(): void {
    this._changePin.value = UiState.idle()
  }

  /** Manual logout — wipes in-memory keyring + emits locked$ → RootNav routes to UnlockScreen. */
  public lockNow(): void {
    this.autoLock.lockNow()
  }
}

export default SettingsViewModel
