import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import { StateFlow, UiState, ViewModel } from "react-native-mobile-mvvm"
import { takeUntil } from "rxjs"
import WalletRepository from "../repositories/wallet.repository"
import AutoLockService from "../core/lifecycle/auto-lock.service"
import SettingsService from "../core/storage/settings.service"
import PushService from "../core/notifications/push.service"
import V03EncryptMigration from "../core/migration/v0.3-encrypt.migration"
import { Tokens } from "../core/di/tokens"

type AppRoute = "onboarding" | "unlock" | "migrate" | "app"

@Injectable()
class RootViewModel extends ViewModel {
  private readonly _route = new StateFlow<UiState<AppRoute>>(UiState.loading())
  public readonly route$ = this._route.asReadOnly()

  public constructor(
    @Inject(Tokens.WalletRepository) private readonly wallet: WalletRepository,
    @Inject(Tokens.AutoLock) private readonly autoLock: AutoLockService,
    @Inject(Tokens.Settings) private readonly settings: SettingsService,
    @Inject(Tokens.Push) private readonly push: PushService,
    @Inject(Tokens.V03EncryptMigration) private readonly migration: V03EncryptMigration
  ) {
    super()
  }

  /**
   * Called once on app boot. Reads keychain to decide which navigator to
   * render. Also wires the auto-lock listener so a timeout flips the
   * navigator back to UnlockScreen.
   */
  public bootstrap(thresholdMs?: number): void {
    this.autoLock.start(thresholdMs ?? this.settings.getAutoLockMs())
    // A lock can mean "timed out" (wallet still present → unlock) OR "logged out"
    // (credentials wiped → onboarding). Re-check the keychain so both land right.
    this.autoLock.locked$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      void this.launch(async signal => {
        const stillHasWallet = await this.wallet.hasWallet()
        if (signal.aborted) return
        this._route.value = UiState.success(stillHasWallet ? "unlock" : "onboarding")
      })
    })
    void this.push.registerWithBackend()
    this.push.subscribeTokenRefresh()

    void this.launch(async signal => {
      try {
        const hasWallet = await this.wallet.hasWallet()
        if (signal.aborted) return
        if (!hasWallet) {
          this._route.value = UiState.success("onboarding")
          return
        }
        const needsMigration = await this.migration.needsMigration()
        if (signal.aborted) return
        if (needsMigration) {
          this._route.value = UiState.success("migrate")
          return
        }
        this._route.value = UiState.success(this.wallet.isUnlocked() ? "app" : "unlock")
      } catch (err) {
        if (signal.aborted) return
        this._route.value = UiState.error(err instanceof Error ? err.message : String(err))
      }
    })
  }

  /** Run the v0.2 → v0.3 migration with the user-supplied PIN. */
  public runMigration(pin: string): void {
    void this.launch(async signal => {
      try {
        await this.migration.run(pin)
        if (signal.aborted) return
        this._route.value = UiState.success("unlock")
      } catch (err) {
        if (signal.aborted) return
        this._route.value = UiState.error(err instanceof Error ? err.message : String(err))
      }
    })
  }

  /** Signal that wallet is created/restored/unlocked → switch to main app. */
  public enterApp(): void {
    this._route.value = UiState.success("app")
  }

  /** Force back to unlock (logout-but-keep-keychain). */
  public requireUnlock(): void {
    this.autoLock.lockNow()
    this._route.value = UiState.success("unlock")
  }

  protected override onCleared(): void {
    this.autoLock.stop()
  }
}

export default RootViewModel
export type { AppRoute }
