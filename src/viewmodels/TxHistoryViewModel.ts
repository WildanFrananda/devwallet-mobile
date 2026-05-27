import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import {
  ComputedStateFlow,
  StateFlow,
  UiState,
  ViewModel,
  type ReadOnlyStateFlow
} from "react-native-mobile-mvvm"
import WalletRepository from "../repositories/wallet.repository"
import { Tokens } from "../core/di/tokens"
import Transaction from "../models/transaction.model"
import { Chain } from "../core/constants/chains.enum"

type StatusFilter = "all" | "pending" | "success" | "failed"

const PAGE_SIZE = 20

@Injectable()
class TxHistoryViewModel extends ViewModel {
  private readonly _items = new StateFlow<Transaction[]>([])
  private readonly _state = new StateFlow<UiState<Transaction[]>>(UiState.idle())
  private readonly _page = new StateFlow<number>(1)
  private readonly _hasMore = new StateFlow<boolean>(false)
  private readonly _loadingMore = new StateFlow<boolean>(false)
  private readonly _filter = new StateFlow<StatusFilter>("all")

  public readonly state$ = this._state.asReadOnly()
  public readonly page$ = this._page.asReadOnly()
  public readonly hasMore$ = this._hasMore.asReadOnly()
  public readonly loadingMore$ = this._loadingMore.asReadOnly()
  public readonly filter$ = this._filter.asReadOnly()

  public readonly filteredItems$: ReadOnlyStateFlow<Transaction[]> = ComputedStateFlow.from(
    [this._items, this._filter],
    ([items, filter]) => {
      if (filter === "all") return items
      return items.filter(tx => tx.status === filter)
    }
  )

  private chain: Chain | null = null
  private address: string | null = null

  public constructor(@Inject(Tokens.WalletRepository) private readonly wallet: WalletRepository) {
    super()
  }

  public load(chain: Chain, address: string): void {
    this.chain = chain
    this.address = address
    this._items.value = []
    this._page.value = 1
    this._hasMore.value = false
    this._state.value = UiState.loading()
    void this.launch(async signal => {
      try {
        const list = await this.wallet.loadTxHistory(chain, address, PAGE_SIZE)
        if (signal.aborted) return
        this._items.value = list
        this._hasMore.value = list.length >= PAGE_SIZE
        this._state.value = UiState.success(list)
      } catch (err) {
        if (signal.aborted) return
        this._state.value = UiState.error(err instanceof Error ? err.message : String(err))
      }
    })
  }

  public loadMore(): void {
    if (!this.chain || !this.address) return
    if (this._loadingMore.value || !this._hasMore.value) return
    const nextPage = this._page.value + 1
    this._loadingMore.value = true
    void this.launch(async signal => {
      try {
        const list = await this.wallet.loadTxHistory(this.chain!, this.address!, PAGE_SIZE * nextPage)
        if (signal.aborted) return
        const fresh = list.slice(this._items.value.length)
        this._items.value = [...this._items.value, ...fresh]
        this._page.value = nextPage
        this._hasMore.value = fresh.length >= PAGE_SIZE
        this._state.value = UiState.success(this._items.value)
      } catch {
        if (signal.aborted) return
        this._hasMore.value = false
      } finally {
        if (!signal.aborted) this._loadingMore.value = false
      }
    })
  }

  public setFilter(filter: StatusFilter): void {
    this._filter.value = filter
  }
}

export default TxHistoryViewModel
export type { StatusFilter }
export { PAGE_SIZE }
