import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import { StateFlow, UiState, ViewModel } from "react-native-mobile-mvvm"
import { interval, takeUntil } from "rxjs"
import { Chain } from "../core/constants/chains.enum"
import { Tokens } from "../core/di/tokens"
import type GasRepository from "../repositories/gas.repository"
import type { GasOracleSnapshot, GasTier } from "../datasources/gas/gas-oracle.datasource"

const REFRESH_MS = 12_000
const EVM_CHAINS: ReadonlyArray<Chain> = [
  Chain.EVM_SEPOLIA,
  Chain.EVM_POLYGON_AMOY,
  Chain.EVM_BASE_SEPOLIA
]

type SelectedTier = GasTier["label"]

@Injectable()
class GasOracleViewModel extends ViewModel {
  private readonly _chain = new StateFlow<Chain>(Chain.EVM_SEPOLIA)
  private readonly _snapshot = new StateFlow<UiState<GasOracleSnapshot>>(UiState.idle())
  private readonly _selectedTier = new StateFlow<SelectedTier>("standard")
  private autoRefreshOn = false

  public readonly chain$ = this._chain.asReadOnly()
  public readonly snapshot$ = this._snapshot.asReadOnly()
  public readonly selectedTier$ = this._selectedTier.asReadOnly()
  public readonly chains: ReadonlyArray<Chain> = EVM_CHAINS

  public constructor(@Inject(Tokens.GasRepository) private readonly repo: GasRepository) {
    super()
  }

  public setChain(chain: Chain): void {
    if (this._chain.value === chain) return
    this._chain.value = chain
    this.refresh()
  }

  public setSelectedTier(tier: SelectedTier): void {
    this._selectedTier.value = tier
  }

  public refresh(): void {
    const chain = this._chain.value
    if (this._snapshot.value.status !== "success") {
      this._snapshot.value = UiState.loading()
    }
    void this.launch(async signal => {
      try {
        const snap = await this.repo.fetchOracle(chain)
        if (signal.aborted || this._chain.value !== chain) return
        this._snapshot.value = UiState.success(snap)
      } catch (err) {
        if (signal.aborted || this._chain.value !== chain) return
        if (this._snapshot.value.status !== "success") {
          this._snapshot.value = UiState.error(err instanceof Error ? err.message : String(err))
        }
      }
    })
  }

  public startAutoRefresh(intervalMs: number = REFRESH_MS): void {
    if (this.autoRefreshOn) return
    this.autoRefreshOn = true
    this.refresh()
    interval(intervalMs)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.refresh())
  }

  /**
   * Resolve the user's selected tier from the current snapshot — handy
   * when the Send screen needs to inject this tier's fees into a tx.
   * Returns null if no snapshot is loaded yet.
   */
  public currentTier(): GasTier | null {
    const state = this._snapshot.value
    if (state.status !== "success") return null
    return state.data.tiers.find(t => t.label === this._selectedTier.value) ?? null
  }
}

export default GasOracleViewModel
export type { SelectedTier }
