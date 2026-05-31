import "reflect-metadata"
import { Subject } from "rxjs"
import RpcInspectorViewModel from "../src/viewmodels/RpcInspectorViewModel"
import RpcLog from "../src/models/rpc-log.model"
import { Chain } from "../src/core/constants/chains.enum"
import type RpcLogRepository from "../src/repositories/rpc-log.repository"
import type RpcReplayDatasource from "../src/datasources/rpc-replay/rpc-replay.datasource"
import type { ReplayOutcome } from "../src/datasources/rpc-replay/rpc-replay.datasource"

class FakeReplayer implements Pick<RpcReplayDatasource, "replay"> {
  public next: ReplayOutcome = { kind: "success", response: "ok", latencyMs: 12 }
  public calls: RpcLog[] = []
  public replay(log: RpcLog): Promise<ReplayOutcome> {
    this.calls.push(log)
    return Promise.resolve(this.next)
  }
}

function log(method: string, chain: Chain, status: "success" | "error" = "success"): RpcLog {
  return new RpcLog({
    id: `${method}-${chain}-${status}-${Math.random()}`,
    chain,
    endpoint: "https://rpc.example",
    method,
    params: [{ address: "0xdeadbeef" }],
    response: status === "success" ? { result: "ok" } : null,
    errorMessage: status === "error" ? "boom" : null,
    status,
    latencyMs: 100,
    timestamp: new Date()
  })
}

class FakeRepo implements RpcLogRepository {
  public readonly subject = new Subject<RpcLog[]>()
  public buffer: RpcLog[] = []
  public exported = "exported"

  public append(l: RpcLog): void {
    this.buffer = [l, ...this.buffer]
    this.subject.next(this.buffer)
  }

  public list(): RpcLog[] {
    return this.buffer
  }

  public stream$(): import("rxjs").Observable<RpcLog[]> {
    return this.subject.asObservable()
  }

  public clear(): void {
    this.buffer = []
    this.subject.next([])
  }

  public exportJson(): string {
    return this.exported
  }
}

function makeVm(): { vm: RpcInspectorViewModel; repo: FakeRepo; replayer: FakeReplayer } {
  const repo = new FakeRepo()
  const replayer = new FakeReplayer()
  const vm = new RpcInspectorViewModel(repo, replayer as unknown as RpcReplayDatasource)
  return { vm, repo, replayer }
}

describe("RpcInspectorViewModel", () => {
  it("seeds filteredLogs$ from the repository's current snapshot", () => {
    const repo = new FakeRepo()
    repo.buffer = [log("eth_chainId", Chain.EVM_SEPOLIA)]
    const replayer = new FakeReplayer()
    const vm = new RpcInspectorViewModel(repo, replayer as unknown as RpcReplayDatasource)
    expect(vm.filteredLogs$.value).toHaveLength(1)
  })

  it("subscribes to repository stream and re-emits on append", () => {
    const { vm, repo } = makeVm()
    repo.append(log("eth_chainId", Chain.EVM_SEPOLIA))
    expect(vm.filteredLogs$.value).toHaveLength(1)
    repo.append(log("eth_blockNumber", Chain.EVM_SEPOLIA))
    expect(vm.filteredLogs$.value).toHaveLength(2)
  })

  it("chain filter narrows results", () => {
    const { vm, repo } = makeVm()
    repo.append(log("eth_chainId", Chain.EVM_SEPOLIA))
    repo.append(log("getBalance", Chain.SOLANA_DEVNET))
    vm.setChainFilter(Chain.SOLANA_DEVNET)
    expect(vm.filteredLogs$.value).toHaveLength(1)
    expect(vm.filteredLogs$.value[0]!.chain).toBe(Chain.SOLANA_DEVNET)
  })

  it("status filter narrows to errors only", () => {
    const { vm, repo } = makeVm()
    repo.append(log("a", Chain.EVM_SEPOLIA, "success"))
    repo.append(log("b", Chain.EVM_SEPOLIA, "error"))
    vm.setStatusFilter("error")
    expect(vm.filteredLogs$.value).toHaveLength(1)
    expect(vm.filteredLogs$.value[0]!.status).toBe("error")
  })

  it("search query matches across method, endpoint, and params", () => {
    const { vm, repo } = makeVm()
    repo.append(log("eth_chainId", Chain.EVM_SEPOLIA))
    repo.append(log("eth_blockNumber", Chain.EVM_SEPOLIA))
    vm.setSearchQuery("blocknumber")
    expect(vm.filteredLogs$.value).toHaveLength(1)
    expect(vm.filteredLogs$.value[0]!.method).toBe("eth_blockNumber")
    vm.setSearchQuery("deadbeef") // hits sanitized params
    expect(vm.filteredLogs$.value).toHaveLength(2)
  })

  it("clearLogs() delegates to repo + empties view", () => {
    const { vm, repo } = makeVm()
    repo.append(log("eth_chainId", Chain.EVM_SEPOLIA))
    vm.clearLogs()
    expect(repo.list()).toHaveLength(0)
    expect(vm.filteredLogs$.value).toHaveLength(0)
  })

  it("exportJson() proxies to the repo", () => {
    const { vm, repo } = makeVm()
    repo.exported = "{}"
    expect(vm.exportJson()).toBe("{}")
  })

  it("replay() invokes the datasource and surfaces the outcome", async () => {
    const { vm, repo, replayer } = makeVm()
    const target = log("eth_chainId", Chain.EVM_SEPOLIA)
    repo.append(target)
    replayer.next = { kind: "success", response: "0xaa36a7", latencyMs: 42 }
    vm.replay(target.id)
    await new Promise<void>(resolve => setTimeout(() => resolve(), 5))
    expect(replayer.calls).toHaveLength(1)
    expect(replayer.calls[0]!.method).toBe("eth_chainId")
    const out = vm.lastReplay$.value
    expect(out?.logId).toBe(target.id)
    expect(out?.outcome.kind).toBe("success")
  })

  it("replay() is a no-op for an unknown log id", async () => {
    const { vm, replayer } = makeVm()
    vm.replay("does-not-exist")
    await new Promise<void>(resolve => setTimeout(() => resolve(), 5))
    expect(replayer.calls).toHaveLength(0)
    expect(vm.lastReplay$.value).toBeNull()
  })

  it("setMock parses JSON, fallback to raw string", () => {
    const { vm } = makeVm()
    vm.setMock("eth_blockNumber", "\"0xff\"")
    let mocks = vm.mocks$.value
    expect(mocks.find(m => m.method === "eth_blockNumber")?.response).toBe("0xff")
    vm.setMock("custom", "raw text not json")
    mocks = vm.mocks$.value
    expect(mocks.find(m => m.method === "custom")?.response).toBe("raw text not json")
    vm.clearAllMocks()
  })

  it("setMock rejects empty input", () => {
    const { vm } = makeVm()
    expect(() => vm.setMock("eth_chainId", "")).toThrow(/empty/i)
    expect(() => vm.setMock("eth_chainId", "   ")).toThrow(/empty/i)
  })

  it("deleteMock removes a single entry", () => {
    const { vm } = makeVm()
    vm.setMock("eth_chainId", "\"0x1\"")
    vm.setMock("eth_blockNumber", "\"0x2\"")
    vm.deleteMock("eth_chainId")
    const mocks = vm.mocks$.value
    expect(mocks.map(m => m.method)).toEqual(["eth_blockNumber"])
    vm.clearAllMocks()
  })

  it("dismissReplay clears the banner state", async () => {
    const { vm, repo } = makeVm()
    const target = log("eth_chainId", Chain.EVM_SEPOLIA)
    repo.append(target)
    vm.replay(target.id)
    await new Promise<void>(resolve => setTimeout(() => resolve(), 5))
    expect(vm.lastReplay$.value).not.toBeNull()
    vm.dismissReplay()
    expect(vm.lastReplay$.value).toBeNull()
  })
})
