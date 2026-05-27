import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import { EventFlow, StateFlow, UiState, ViewModel } from "react-native-mobile-mvvm"
import PinService from "../core/auth/pin.service"
import { Tokens } from "../core/di/tokens"

type Stage = "current" | "new" | "confirm"

@Injectable()
class ChangePinViewModel extends ViewModel {
  private readonly _stage = new StateFlow<Stage>("current")
  private readonly _currentPin = new StateFlow<string>("")
  private readonly _newPin = new StateFlow<string>("")
  private readonly _confirmPin = new StateFlow<string>("")
  private readonly _save = new StateFlow<UiState<void>>(UiState.idle())
  private readonly _saved = new EventFlow<void>()

  public readonly stage$ = this._stage.asReadOnly()
  public readonly currentPin$ = this._currentPin.asReadOnly()
  public readonly newPin$ = this._newPin.asReadOnly()
  public readonly confirmPin$ = this._confirmPin.asReadOnly()
  public readonly save$ = this._save.asReadOnly()
  public readonly saved$ = this._saved.asObservable()

  public constructor(@Inject(Tokens.Pin) private readonly pin: PinService) {
    super()
  }

  public setCurrentPin(value: string): void {
    this._currentPin.value = ChangePinViewModel.sanitize(value)
    this.clearErrorIfNeeded()
  }

  public setNewPin(value: string): void {
    this._newPin.value = ChangePinViewModel.sanitize(value)
    this.clearErrorIfNeeded()
  }

  public setConfirmPin(value: string): void {
    this._confirmPin.value = ChangePinViewModel.sanitize(value)
    this.clearErrorIfNeeded()
  }

  public advance(): void {
    const stage = this._stage.value
    if (stage === "current") {
      if (this._currentPin.value.length !== 6) {
        this._save.value = UiState.error("Enter 6 digits")
        return
      }
      this._stage.value = "new"
      return
    }
    if (stage === "new") {
      if (this._newPin.value.length !== 6) {
        this._save.value = UiState.error("Enter 6 digits")
        return
      }
      if (this._newPin.value === this._currentPin.value) {
        this._save.value = UiState.error("New PIN must differ from current")
        return
      }
      this._stage.value = "confirm"
      return
    }
    // confirm → save
    if (this._confirmPin.value !== this._newPin.value) {
      this._save.value = UiState.error("PINs do not match")
      return
    }
    this.runSave()
  }

  public back(): void {
    const stage = this._stage.value
    if (stage === "confirm") {
      this._stage.value = "new"
      this._confirmPin.value = ""
    } else if (stage === "new") {
      this._stage.value = "current"
      this._newPin.value = ""
    }
    this._save.value = UiState.idle()
  }

  private runSave(): void {
    this._save.value = UiState.loading()
    void this.launch(async signal => {
      try {
        await this.pin.changePin(this._currentPin.value, this._newPin.value)
        if (signal.aborted) return
        this._save.value = UiState.success(undefined)
        this._saved.emit()
      } catch (err) {
        if (signal.aborted) return
        this._save.value = UiState.error(err instanceof Error ? err.message : String(err))
        // Reset current PIN field — likely wrong.
        if (this._save.value.status === "error" && /match|incorrect|wrong/i.test(this._save.value.message)) {
          this._currentPin.value = ""
          this._newPin.value = ""
          this._confirmPin.value = ""
          this._stage.value = "current"
        }
      }
    })
  }

  private clearErrorIfNeeded(): void {
    if (this._save.value.status === "error") this._save.value = UiState.idle()
  }

  private static sanitize(value: string): string {
    return value.replace(/\D/g, "").slice(0, 6)
  }
}

export default ChangePinViewModel
