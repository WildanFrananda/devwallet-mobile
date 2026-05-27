import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import { EventFlow, StateFlow, UiState, ViewModel } from "react-native-mobile-mvvm"
import WalletRepository from "../repositories/wallet.repository"
import PinService, { MAX_ATTEMPTS } from "../core/auth/pin.service"
import Account from "../models/account.model"
import { Tokens } from "../core/di/tokens"

@Injectable()
class EnterPinViewModel extends ViewModel {
  private readonly _pin = new StateFlow<string>("")
  private readonly _state = new StateFlow<UiState<Account>>(UiState.idle())
  private readonly _attemptsLeft = new StateFlow<number>(MAX_ATTEMPTS)
  private readonly _lockoutMs = new StateFlow<number>(0)
  private readonly _unlocked = new EventFlow<Account>()

  public readonly pin$ = this._pin.asReadOnly()
  public readonly state$ = this._state.asReadOnly()
  public readonly attemptsLeft$ = this._attemptsLeft.asReadOnly()
  public readonly lockoutMs$ = this._lockoutMs.asReadOnly()
  public readonly unlocked$ = this._unlocked.asObservable()

  private tickHandle: ReturnType<typeof setInterval> | null = null

  public constructor(
    @Inject(Tokens.WalletRepository) private readonly wallet: WalletRepository,
    @Inject(Tokens.Pin) private readonly pinService: PinService
  ) {
    super()
    this.refreshLockout()
  }

  public setPin(value: string): void {
    this._pin.value = value.replace(/\D/g, "").slice(0, 6)
    if (this._state.value.status === "error") this._state.value = UiState.idle()
  }

  public submit(): void {
    if (this._pin.value.length !== 6) {
      this._state.value = UiState.error("Enter 6 digits")
      return
    }
    if (this.pinService.isLockedOut()) {
      this.refreshLockout()
      return
    }
    this._state.value = UiState.loading()
    void this.launch(async signal => {
      try {
        const account = await this.wallet.unlock("pin", this._pin.value)
        if (signal.aborted) return
        this._state.value = UiState.success(account)
        this._unlocked.emit(account)
      } catch (err) {
        if (signal.aborted) return
        const msg = err instanceof Error ? err.message : String(err)
        this._state.value = UiState.error(msg)
        this._pin.value = ""
        this.refreshLockout()
      }
    })
  }

  public reset(): void {
    this._pin.value = ""
    this._state.value = UiState.idle()
    this.refreshLockout()
  }

  protected override onCleared(): void {
    this.stopTick()
  }

  private refreshLockout(): void {
    this._attemptsLeft.value = this.pinService.getRemainingAttempts()
    const ms = this.pinService.getLockoutMsRemaining()
    this._lockoutMs.value = ms
    if (ms > 0) {
      this.startTick()
    } else {
      this.stopTick()
    }
  }

  private startTick(): void {
    if (this.tickHandle) return
    this.tickHandle = setInterval(() => {
      const ms = this.pinService.getLockoutMsRemaining()
      this._lockoutMs.value = ms
      if (ms <= 0) {
        this._attemptsLeft.value = this.pinService.getRemainingAttempts()
        this.stopTick()
      }
    }, 250)
  }

  private stopTick(): void {
    if (this.tickHandle) {
      clearInterval(this.tickHandle)
      this.tickHandle = null
    }
  }
}

export default EnterPinViewModel
