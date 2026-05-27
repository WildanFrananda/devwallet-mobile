import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import {
  ComputedStateFlow,
  StateFlow,
  UiState,
  ViewModel,
  type ReadOnlyStateFlow
} from "react-native-mobile-mvvm"
import { interval, takeUntil } from "rxjs"
import WalletRepository from "../repositories/wallet.repository"
import { Tokens } from "../core/di/tokens"
import Portfolio from "../models/portfolio.model"
import Token from "../models/token.model"
import { Chain } from "../core/constants/chains.enum"
import { PriceRegistry } from "../core/constants/prices"

type TokenMap = Readonly<Record<string, ReadonlyArray<Token>>>

const AUTO_REFRESH_MS = 30_000

@Injectable()
class WalletViewModel extends ViewModel {
  private readonly _portfolio = new StateFlow<UiState<Portfolio>>(UiState.idle())
  private readonly _tokens = new StateFlow<TokenMap>({})
  private readonly _isRefreshing = new StateFlow<boolean>(false)
  public readonly portfolio$ = this._portfolio.asReadOnly()
  public readonly tokens$ = this._tokens.asReadOnly()
  public readonly isRefreshing$ = this._isRefreshing.asReadOnly()

  /**
   * Sum of native USD value across all chain entries that resolved
   * successfully. Failed chains are skipped — they don't zero out the
   * total. Phase 1 uses hardcoded rates from `PriceRegistry`.
   */
  public readonly totalUsd$: ReadOnlyStateFlow<number | null> = ComputedStateFlow.from(
    [this._portfolio],
    ([state]) => {
      if (state.status !== "success") return null
      let total = 0
      for (const entry of state.data.entries) {
        const balance = entry.balance
        if (!balance) continue
        const native = Number(balance.raw) / 10 ** balance.decimals
        const price = PriceRegistry.native(balance.chain)
        total += native * price
      }
      return total
    }
  )

  private autoRefreshOn: boolean = false
  private lastAddressIndex: number = 0

  public constructor(@Inject(Tokens.WalletRepository) private readonly wallet: WalletRepository) {
    super()
  }

  /**
   * Initial fetch — flips state to loading so the screen can show a full-
   * page spinner while there's no data yet. Use `refreshPortfolio()` for
   * subsequent updates so the UI stays painted with the previous values
   * until the new fetch returns.
   */
  public loadPortfolio(addressIndex: number = 0): void {
    this.lastAddressIndex = addressIndex
    if (this._portfolio.value.status !== "success") {
      this._portfolio.value = UiState.loading()
    } else {
      this._isRefreshing.value = true
    }
    void this.runFetch(addressIndex)
  }

  /**
   * Silent background refresh — never flips portfolio$ to loading. Replaces
   * the success payload only when the new fetch resolves successfully so
   * the list keeps rendering current values during network roundtrips.
   */
  public refreshPortfolio(addressIndex: number = this.lastAddressIndex): void {
    this.lastAddressIndex = addressIndex
    if (this._isRefreshing.value) return
    this._isRefreshing.value = true
    void this.runFetch(addressIndex)
  }

  private async runFetch(addressIndex: number): Promise<void> {
    await this.launch(async signal => {
      try {
        const portfolio = await this.wallet.loadPortfolio(addressIndex)
        if (signal.aborted) return
        this._portfolio.value = UiState.success(portfolio)
      } catch (err) {
        if (signal.aborted) return
        if (this._portfolio.value.status !== "success") {
          this._portfolio.value = UiState.error(err instanceof Error ? err.message : String(err))
        }
        // On silent refresh failure we keep the last successful data —
        // a transient RPC blip shouldn't blank the dashboard.
      } finally {
        if (!signal.aborted) {
          this._isRefreshing.value = false
        }
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
   * Start a polling loop that runs `refreshPortfolio()` (silent) every
   * `intervalMs`. Safe to call multiple times — subsequent calls are
   * no-ops. Auto-cancelled by `takeUntil(destroy$)` on VM clear.
   */
  public startAutoRefresh(intervalMs: number = AUTO_REFRESH_MS): void {
    if (this.autoRefreshOn) return
    this.autoRefreshOn = true
    interval(intervalMs)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.refreshPortfolio(this.lastAddressIndex))
  }

  public reset(): void {
    this._portfolio.value = UiState.idle()
    this._tokens.value = {}
    this._isRefreshing.value = false
  }
}

export default WalletViewModel
