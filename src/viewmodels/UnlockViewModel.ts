import { inject, injectable } from "tsyringe"
import { EventFlow, StateFlow, UiState, ViewModel } from "react-native-mobile-mvvm"
import WalletRepository from "../repositories/wallet.repository"
import { Tokens } from "../core/di/tokens"
import Account from "../models/account.model"

@injectable()
class UnlockViewModel extends ViewModel {
  private readonly _state = new StateFlow<UiState<Account>>(UiState.idle())
  private readonly _unlocked = new EventFlow<Account>()
  public readonly state$ = this._state.asReadOnly()
  public readonly unlocked$ = this._unlocked.asObservable()

  public constructor(@inject(Tokens.WalletRepository) private readonly wallet: WalletRepository) {
    super()
  }

  public unlock(promptMessage: string = "Unlock DevWallet"): void {
    this._state.value = UiState.loading()
    void this.launch(async signal => {
      try {
        const account = await this.wallet.unlock(promptMessage)
        if (signal.aborted) return
        this._state.value = UiState.success(account)
        this._unlocked.emit(account)
      } catch (err) {
        if (signal.aborted) return
        this._state.value = UiState.error(err instanceof Error ? err.message : String(err))
      }
    })
  }

  public reset(): void {
    this._state.value = UiState.idle()
  }
}

export default UnlockViewModel
