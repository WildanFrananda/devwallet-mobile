import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import { StateFlow, UiState, ViewModel } from "react-native-mobile-mvvm"
import { interval, takeUntil } from "rxjs"
import WalletRepository from "../repositories/wallet.repository"
import { Tokens } from "../core/di/tokens"
import Portfolio from "../models/portfolio.model"
import Token from "../models/token.model"
import { Chain } from "../core/constants/chains.enum"

type TokenMap = Readonly<Record<string, ReadonlyArray<Token>>>

const AUTO_REFRESH_MS = 30_000

@Injectable()
class WalletViewModel extends ViewModel {
  private readonly _portfolio = new StateFlow<UiState<Portfolio>>(UiState.idle())
  private readonly _tokens = new StateFlow<TokenMap>({})
  public readonly portfolio$ = this._portfolio.asReadOnly()
  public readonly tokens$ = this._tokens.asReadOnly()

  private autoRefreshOn: boolean = false
  private lastAddressIndex: number = 0

  public constructor(@Inject(Tokens.WalletRepository) private readonly wallet: WalletRepository) {
    super()
  }

  public loadPortfolio(addressIndex: number = 0): void {
    this.lastAddressIndex = addressIndex
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

  public loadTokens(chain: Chain, address: string): void {
    void this.launch(async signal => {
      try {
        const list = await this.wallet.loadTokens(chain, address)
        if (signal.aborted) return
        this._tokens.value = { ...this._tokens.value, [chain]: list }
      } catch {
        if (signal.aborted) return
        this._tokens.value = { ...this._tokens.value, [chain]: [] }
      }
    })
  }

  /**
   * Start a 30s polling loop that re-runs `loadPortfolio` at the last
   * address index. Safe to call multiple times — subsequent calls are
   * no-ops. Auto-cancelled by `takeUntil(destroy$)` on VM clear.
   */
  public startAutoRefresh(intervalMs: number = AUTO_REFRESH_MS): void {
    if (this.autoRefreshOn) return
    this.autoRefreshOn = true
    interval(intervalMs)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadPortfolio(this.lastAddressIndex))
  }

  public reset(): void {
    this._portfolio.value = UiState.idle()
    this._tokens.value = {}
  }
}

export default WalletViewModel
