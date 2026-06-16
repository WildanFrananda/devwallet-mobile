import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import { StateFlow, UiState, ViewModel } from "react-native-mobile-mvvm"
import SettingsService from "../core/storage/settings.service"
import AutoLockService from "../core/lifecycle/auto-lock.service"
import PinService from "../core/auth/pin.service"
import WalletRepository from "../repositories/wallet.repository"
import { Tokens } from "../core/di/tokens"

@Injectable()
class SettingsViewModel extends ViewModel {
  private readonly _autoLockMs = new StateFlow<number>(0)
  private readonly _useBiometric = new StateFlow<boolean>(true)
  private readonly _changePin = new StateFlow<UiState<void>>(UiState.idle())
  private readonly _logout = new StateFlow<UiState<void>>(UiState.idle())
  public readonly autoLockMs$ = this._autoLockMs.asReadOnly()
  public readonly useBiometric$ = this._useBiometric.asReadOnly()
  public readonly changePin$ = this._changePin.asReadOnly()
  public readonly logout$ = this._logout.asReadOnly()

  public constructor(
    @Inject(Tokens.Settings) private readonly settings: SettingsService,
    @Inject(Tokens.AutoLock) private readonly autoLock: AutoLockService,
    @Inject(Tokens.Pin) private readonly pin: PinService,
    @Inject(Tokens.WalletRepository) private readonly wallet: WalletRepository
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
    // Toggle is purely a routing preference for UnlockScreen — the cached
    // PIN keychain row stays regardless. Disabling just steers the first
    // unlock attempt through the typed-PIN path; re-enabling restores the
    // biometric prompt without re-collecting the PIN.
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

  /** Soft lock — wipes in-memory keyring + emits locked$ → RootNav routes to UnlockScreen. */
  public lockNow(): void {
    this.autoLock.lockNow()
  }

  /**
   * Hard logout — permanently wipes ALL on-device credentials (mnemonic, PIN,
   * cached biometric PIN, device binding) from the keychain, then signals the
   * lock. RootNavigator re-checks the keychain on lock and, finding no wallet,
   * routes to onboarding. Irreversible without the recovery phrase.
   */
  public logout(): void {
    this._logout.value = UiState.loading()
    void this.launch(async signal => {
      try {
        await this.wallet.clear()
        if (signal.aborted) return
        this._logout.value = UiState.success(undefined)
        // wallet.clear() already wiped the keyring, so lockNow()'s isUnlocked()
        // guard would no-op — emit the lock signal directly so RootNavigator
        // re-checks the (now empty) keychain and routes to onboarding.
        this.autoLock.signalLocked()
      } catch (err) {
        if (signal.aborted) return
        this._logout.value = UiState.error(err instanceof Error ? err.message : String(err))
      }
    })
  }
}

export default SettingsViewModel
