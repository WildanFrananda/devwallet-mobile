import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import { ComputedStateFlow, StateFlow, UiState, ViewModel, type ReadOnlyStateFlow } from "react-native-mobile-mvvm"
import { interval, takeUntil } from "rxjs"
import { Chain } from "../core/constants/chains.enum"
import { PriceRegistry } from "../core/constants/prices"
import { Tokens } from "../core/di/tokens"
import type GasRepository from "../repositories/gas.repository"
import type GasHistoryRepository from "../repositories/gas-history.repository"
import type { GasSample } from "../repositories/gas-history.repository"
import type { GasOracleSnapshot, GasTier } from "../datasources/gas/gas-oracle.datasource"

const REFRESH_MS = 12_000
const HISTORY_SAMPLE_MS = 5 * 60 * 1000
const DEFAULT_GAS_LIMIT = 21_000n
const MIN_GAS_LIMIT = 21_000n
const MAX_GAS_LIMIT = 500_000n
const EVM_CHAINS: ReadonlyArray<Chain> = [
  Chain.EVM_SEPOLIA,
  Chain.EVM_POLYGON_AMOY,
  Chain.EVM_BASE_SEPOLIA
]

type SelectedTier = GasTier["label"]

const GAS_LIMIT_PRESETS: ReadonlyArray<bigint> = [21_000n, 50_000n, 100_000n, 200_000n, 500_000n]

@Injectable()
class GasOracleViewModel extends ViewModel {
  private readonly _chain = new StateFlow<Chain>(Chain.EVM_SEPOLIA)
  private readonly _snapshot = new StateFlow<UiState<GasOracleSnapshot>>(UiState.idle())
  private readonly _selectedTier = new StateFlow<SelectedTier>("standard")
  private readonly _gasLimit = new StateFlow<bigint>(DEFAULT_GAS_LIMIT)
  private readonly _history = new StateFlow<ReadonlyArray<GasSample>>([])
  private autoRefreshOn = false

  public readonly chain$ = this._chain.asReadOnly()
  public readonly snapshot$ = this._snapshot.asReadOnly()
  public readonly selectedTier$ = this._selectedTier.asReadOnly()
  public readonly gasLimit$ = this._gasLimit.asReadOnly()
  public readonly history$ = this._history.asReadOnly()
  public readonly chains: ReadonlyArray<Chain> = EVM_CHAINS
  public readonly gasLimitPresets: ReadonlyArray<bigint> = GAS_LIMIT_PRESETS
  public readonly minGasLimit: bigint = MIN_GAS_LIMIT
  public readonly maxGasLimit: bigint = MAX_GAS_LIMIT

  /**
   * USD cost of the selected tier × current gas limit, against the
   * hardcoded native USD rate from `PriceRegistry`. Null when no
   * snapshot is loaded or the chain has no rate entry.
   */
  public readonly totalCostUsd$: ReadOnlyStateFlow<number | null> = ComputedStateFlow.from(
    [this._snapshot, this._selectedTier, this._gasLimit, this._chain],
    ([state, tier, gasLimit, chain]) => {
      if (state.status !== "success") return null
      const selected = state.data.tiers.find(t => t.label === tier)
      if (!selected) return null
      const wei = selected.maxFeePerGas * gasLimit
      const native = Number(wei) / 1e18
      const usd = PriceRegistry.native(chain)
      return native * usd
    }
  )

  public constructor(
    @Inject(Tokens.GasRepository) private readonly repo: GasRepository,
    @Inject(Tokens.GasHistoryRepository) private readonly history: GasHistoryRepository
  ) {
    super()
    this._history.value = this.history.list(this._chain.value)
    this.bindHistory(this._chain.value)
  }

  public setChain(chain: Chain): void {
    if (this._chain.value === chain) return
    this._chain.value = chain
    this._history.value = this.history.list(chain)
    this.bindHistory(chain)
    this.refresh()
  }

  public setSelectedTier(tier: SelectedTier): void {
    this._selectedTier.value = tier
  }

  /**
   * Clamp + assign user's custom gas limit. Accepts BigInt directly so
   * the UI can wire either preset chips or a future slider component
   * without re-coercing.
   */
  public setGasLimit(limit: bigint): void {
    const clamped = limit < MIN_GAS_LIMIT ? MIN_GAS_LIMIT : limit > MAX_GAS_LIMIT ? MAX_GAS_LIMIT : limit
    this._gasLimit.value = clamped
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
        this.recordHistorySample(snap)
      } catch (err) {
        if (signal.aborted || this._chain.value !== chain) return
        if (this._snapshot.value.status !== "success") {
          this._snapshot.value = UiState.error(err instanceof Error ? err.message : String(err))
        }
      }
    })
  }

  private bindHistory(chain: Chain): void {
    this.history
      .stream$(chain)
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => {
        if (this._chain.value === chain) this._history.value = list
      })
  }

  private recordHistorySample(snap: GasOracleSnapshot): void {
    const baseFee = snap.tiers[0]?.baseFee ?? 0n
    this.history.recordIfDue(
      {
        chain: snap.chain,
        takenAtIso: snap.fetchedAtIso,
        tiers: snap.tiers,
        baseFee
      },
      HISTORY_SAMPLE_MS
    )
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
