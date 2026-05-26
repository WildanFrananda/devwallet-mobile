import { inject, injectable } from "tsyringe"
import { StateFlow, UiState, ViewModel } from "react-native-mobile-mvvm"
import WalletRepository from "../repositories/wallet.repository"
import { Tokens } from "../core/di/tokens"
import Portfolio from "../models/portfolio.model"

@injectable()
class WalletViewModel extends ViewModel {
  private readonly _portfolio = new StateFlow<UiState<Portfolio>>(UiState.idle())
  public readonly portfolio$ = this._portfolio.asReadOnly()

  public constructor(@inject(Tokens.WalletRepository) private readonly wallet: WalletRepository) {
    super()
  }

  /**
   * Derive every supported chain at index 0 and fetch native balance for
   * each in parallel. Per-chain failures don't fail the whole call — see
   * Portfolio.failed.
   */
  public loadPortfolio(addressIndex: number = 0): void {
    this._portfolio.value = UiState.loading()
    void this.launch(async signal => {
      try {
        const portfolio = await this.wallet.loadPortfolio(addressIndex)
        if (signal.aborted) return
        this._portfolio.value = UiState.success(portfolio)
      } catch (err) {
        if (signal.aborted) return
        this._portfolio.value = UiState.error(err instanceof Error ? err.message : String(err))
      }
    })
  }

  public reset(): void {
    this._portfolio.value = UiState.idle()
  }
}

export default WalletViewModel
