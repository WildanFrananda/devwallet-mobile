import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import { ComputedStateFlow, StateFlow, ViewModel, type ReadOnlyStateFlow } from "react-native-mobile-mvvm"
import { takeUntil } from "rxjs"
import { Chain } from "../core/constants/chains.enum"
import { Tokens } from "../core/di/tokens"
import type RpcLog from "../models/rpc-log.model"
import type RpcLogRepository from "../repositories/rpc-log.repository"
import RpcMockStore, { type MockEntry } from "../core/network/rpc-mock.store"
import type RpcReplayDatasource from "../datasources/rpc-replay/rpc-replay.datasource"
import type { ReplayOutcome } from "../datasources/rpc-replay/rpc-replay.datasource"

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

  private readonly _mocks = new StateFlow<ReadonlyArray<MockEntry>>([])
  private readonly _lastReplay = new StateFlow<{ logId: string; outcome: ReplayOutcome } | null>(null)
  public readonly mocks$ = this._mocks.asReadOnly()
  public readonly lastReplay$ = this._lastReplay.asReadOnly()

  public constructor(
    @Inject(Tokens.RpcLogRepository) private readonly repo: RpcLogRepository,
    @Inject(Tokens.RpcReplayDatasource) private readonly replayer: RpcReplayDatasource
  ) {
    super()
    this._logs.value = this.repo.list()
    this._mocks.value = RpcMockStore.list()
    this.repo
      .stream$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => {
        this._logs.value = list
      })
    RpcMockStore.stream$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => {
        this._mocks.value = list
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

  public replay(logId: string): void {
    const log = this._logs.value.find(l => l.id === logId)
    if (!log) return
    void this.launch(async signal => {
      const outcome = await this.replayer.replay(log)
      if (signal.aborted) return
      this._lastReplay.value = { logId, outcome }
    })
  }

  /**
   * Register a mock for the given method. `responseJson` is parsed as JSON;
   * invalid JSON falls back to using the raw string as the mock value so
   * users can mock plain text endpoints. Throws on truly empty input so
   * the caller can surface the error to the UI.
   */
  public setMock(method: string, responseJson: string): void {
    const trimmed = responseJson.trim()
    if (trimmed.length === 0) throw new Error("Mock response is empty")
    let parsed: unknown
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      parsed = trimmed
    }
    RpcMockStore.set(method, parsed)
  }

  public deleteMock(method: string): void {
    RpcMockStore.delete(method)
  }

  public clearAllMocks(): void {
    RpcMockStore.clear()
  }

  public dismissReplay(): void {
    this._lastReplay.value = null
  }
}

export default RpcInspectorViewModel
export type { ChainFilter, StatusFilter }
