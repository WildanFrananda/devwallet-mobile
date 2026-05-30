import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import { ComputedStateFlow, StateFlow, ViewModel, type ReadOnlyStateFlow } from "react-native-mobile-mvvm"
import { takeUntil } from "rxjs"
import { Chain } from "../core/constants/chains.enum"
import { Tokens } from "../core/di/tokens"
import type RpcLog from "../models/rpc-log.model"
import type RpcLogRepository from "../repositories/rpc-log.repository"

type ChainFilter = Chain | "all"
type StatusFilter = "all" | "success" | "error"

@Injectable()
class RpcInspectorViewModel extends ViewModel {
  private readonly _logs = new StateFlow<ReadonlyArray<RpcLog>>([])
  private readonly _chainFilter = new StateFlow<ChainFilter>("all")
  private readonly _statusFilter = new StateFlow<StatusFilter>("all")
  private readonly _searchQuery = new StateFlow<string>("")

  public readonly chainFilter$ = this._chainFilter.asReadOnly()
  public readonly statusFilter$ = this._statusFilter.asReadOnly()
  public readonly searchQuery$ = this._searchQuery.asReadOnly()

  /**
   * Filtered view that reacts to any change in the underlying log buffer
   * or the user-controlled filter state. `searchQuery` is matched
   * case-insensitively against method, endpoint, and JSON-stringified
   * params (so a user can paste an address fragment to find it).
   */
  public readonly filteredLogs$: ReadOnlyStateFlow<ReadonlyArray<RpcLog>> = ComputedStateFlow.from(
    [this._logs, this._chainFilter, this._statusFilter, this._searchQuery],
    ([logs, chain, status, query]) => {
      const q = query.trim().toLowerCase()
      return logs.filter(log => {
        if (chain !== "all" && log.chain !== chain) return false
        if (status !== "all" && log.status !== status) return false
        if (q.length === 0) return true
        if (log.method.toLowerCase().includes(q)) return true
        if (log.endpoint.toLowerCase().includes(q)) return true
        const paramsJson = JSON.stringify(log.params).toLowerCase()
        return paramsJson.includes(q)
      })
    }
  )

  public readonly logCount$: ReadOnlyStateFlow<number> = ComputedStateFlow.from(
    [this._logs],
    ([logs]) => logs.length
  )

  public constructor(@Inject(Tokens.RpcLogRepository) private readonly repo: RpcLogRepository) {
    super()
    this._logs.value = this.repo.list()
    this.repo
      .stream$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => {
        this._logs.value = list
      })
  }

  public setChainFilter(filter: ChainFilter): void {
    this._chainFilter.value = filter
  }

  public setStatusFilter(filter: StatusFilter): void {
    this._statusFilter.value = filter
  }

  public setSearchQuery(query: string): void {
    this._searchQuery.value = query
  }

  public clearLogs(): void {
    this.repo.clear()
  }

  public exportJson(): string {
    return this.repo.exportJson()
  }
}

export default RpcInspectorViewModel
export type { ChainFilter, StatusFilter }
