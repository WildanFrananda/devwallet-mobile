import "reflect-metadata"
import { Subject } from "rxjs"
import RpcInspectorViewModel from "../src/viewmodels/RpcInspectorViewModel"
import RpcLog from "../src/models/rpc-log.model"
import { Chain } from "../src/core/constants/chains.enum"
import type RpcLogRepository from "../src/repositories/rpc-log.repository"

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

function makeVm(): { vm: RpcInspectorViewModel; repo: FakeRepo } {
  const repo = new FakeRepo()
  const vm = new RpcInspectorViewModel(repo)
  return { vm, repo }
}

describe("RpcInspectorViewModel", () => {
  it("seeds filteredLogs$ from the repository's current snapshot", () => {
    const repo = new FakeRepo()
    repo.buffer = [log("eth_chainId", Chain.EVM_SEPOLIA)]
    const vm = new RpcInspectorViewModel(repo)
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
})
