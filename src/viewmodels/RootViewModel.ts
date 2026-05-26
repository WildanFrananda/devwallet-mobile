import { inject, injectable } from "tsyringe"
import { StateFlow, UiState, ViewModel } from "react-native-mobile-mvvm"
import { takeUntil } from "rxjs"
import WalletRepository from "../repositories/wallet.repository"
import AutoLockService from "../core/lifecycle/auto-lock.service"
import { Tokens } from "../core/di/tokens"

type AppRoute = "onboarding" | "unlock" | "app"

@injectable()
class RootViewModel extends ViewModel {
  private readonly _route = new StateFlow<UiState<AppRoute>>(UiState.loading())
  public readonly route$ = this._route.asReadOnly()

  public constructor(
    @inject(Tokens.WalletRepository) private readonly wallet: WalletRepository,
    @inject(Tokens.AutoLock) private readonly autoLock: AutoLockService
  ) {
    super()
  }

  /**
   * Called once on app boot. Reads keychain to decide which navigator to
   * render. Also wires the auto-lock listener so a timeout flips the
   * navigator back to UnlockScreen.
   */
  public bootstrap(thresholdMs?: number): void {
    this.autoLock.start(thresholdMs)
    this.autoLock.locked$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this._route.value = UiState.success("unlock")
    })

    void this.launch(async signal => {
      try {
        const hasWallet = await this.wallet.hasWallet()
        if (signal.aborted) return
        if (!hasWallet) {
          this._route.value = UiState.success("onboarding")
          return
        }
        this._route.value = UiState.success(this.wallet.isUnlocked() ? "app" : "unlock")
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
