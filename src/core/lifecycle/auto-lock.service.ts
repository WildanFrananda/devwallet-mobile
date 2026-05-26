import { AppState, type AppStateStatus, type NativeEventSubscription } from "react-native"
import { EventFlow } from "react-native-mobile-mvvm"
import { inject, injectable } from "tsyringe"
import KeyringService from "../crypto/keyring/keyring.service"
import { Tokens } from "../di/tokens"

const DEFAULT_THRESHOLD_MS = 5 * 60 * 1000

/**
 * Watches React Native AppState. When the app is backgrounded for longer
 * than the threshold, wipe the in-memory keyring (mnemonic stays in keychain
 * for re-unlock). UI listens to `locked$` and routes to UnlockScreen.
 */
@injectable()
class AutoLockService {
  private readonly _locked = new EventFlow<void>()
  public readonly locked$ = this._locked.asObservable()

  private lastBackgroundAt: number | null = null
  private subscription: NativeEventSubscription | null = null
  private thresholdMs: number = DEFAULT_THRESHOLD_MS

  public constructor(@inject(Tokens.KeyringService) private readonly keyring: KeyringService) {}

  public start(thresholdMs: number = DEFAULT_THRESHOLD_MS): void {
    this.thresholdMs = thresholdMs
    if (this.subscription) return
    this.subscription = AppState.addEventListener("change", this.onChange)
  }

  public stop(): void {
    this.subscription?.remove()
    this.subscription = null
    this.lastBackgroundAt = null
  }

  /** Force-lock — used by manual logout / Settings → Lock now. */
  public lockNow(): void {
    if (!this.keyring.isUnlocked()) return
    this.keyring.clear()
    this._locked.emit()
  }

  private readonly onChange = (state: AppStateStatus): void => {
    if (state === "background" || state === "inactive") {
      this.lastBackgroundAt = Date.now()
      return
    }
    if (state === "active") {
      const bg = this.lastBackgroundAt
      this.lastBackgroundAt = null
      if (bg !== null && Date.now() - bg >= this.thresholdMs && this.keyring.isUnlocked()) {
        this.keyring.clear()
        this._locked.emit()
      }
    }
  }
}

export default AutoLockService
