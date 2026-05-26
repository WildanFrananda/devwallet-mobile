import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import { StateFlow, UiState, ViewModel } from "react-native-mobile-mvvm"
import WalletRepository from "../repositories/wallet.repository"
import { Tokens } from "../core/di/tokens"
import Transaction from "../models/transaction.model"
import { Chain } from "../core/constants/chains.enum"

@Injectable()
class TxHistoryViewModel extends ViewModel {
  private readonly _state = new StateFlow<UiState<Transaction[]>>(UiState.idle())
  public readonly state$ = this._state.asReadOnly()

  public constructor(@Inject(Tokens.WalletRepository) private readonly wallet: WalletRepository) {
    super()
  }

  public load(chain: Chain, address: string, limit: number = 25): void {
    this._state.value = UiState.loading()
    void this.launch(async signal => {
      try {
        const list = await this.wallet.loadTxHistory(chain, address, limit)
        if (signal.aborted) return
        this._state.value = UiState.success(list)
      } catch (err) {
        if (signal.aborted) return
        this._state.value = UiState.error(err instanceof Error ? err.message : String(err))
      }
    })
  }
}

export default TxHistoryViewModel
