import "reflect-metadata"
import { Subject } from "rxjs"
import { Chain } from "../src/core/constants/chains.enum"
import type GasRepository from "../src/repositories/gas.repository"
import type GasHistoryRepository from "../src/repositories/gas-history.repository"
import type { GasSample } from "../src/repositories/gas-history.repository"
import type { GasOracleSnapshot } from "../src/datasources/gas/gas-oracle.datasource"
import GasOracleViewModel from "../src/viewmodels/GasOracleViewModel"

class FakeRepo implements GasRepository {
  public next: GasOracleSnapshot | null = null
  public error: Error | null = null
  public calls = 0
  public fetchOracle(): Promise<GasOracleSnapshot> {
    this.calls++
    if (this.error) return Promise.reject(this.error)
    if (this.next) return Promise.resolve(this.next)
    return Promise.reject(new Error("no snapshot configured"))
  }
}

class FakeHistoryRepo implements GasHistoryRepository {
  public samples: GasSample[] = []
  public subject = new Subject<ReadonlyArray<GasSample>>()
  public recordIfDue(sample: GasSample): boolean {
    this.samples = [sample, ...this.samples]
    this.subject.next(this.samples)
    return true
  }
  public list(): ReadonlyArray<GasSample> {
    return this.samples
  }
  public stream$(): import("rxjs").Observable<ReadonlyArray<GasSample>> {
    return this.subject.asObservable()
  }
  public clear(): void {
    this.samples = []
    this.subject.next([])
  }
}

function makeVm(repo: FakeRepo): { vm: GasOracleViewModel; history: FakeHistoryRepo } {
  const history = new FakeHistoryRepo()
  const vm = new GasOracleViewModel(repo, history)
  return { vm, history }
}

function makeSnapshot(chain: Chain = Chain.EVM_SEPOLIA): GasOracleSnapshot {
  return {
    chain,
    fetchedAtIso: "2026-05-29T00:00:00Z",
    recentBlockCount: 10,
    tiers: [
      {
        label: "slow",
        baseFee: 100n,
        maxPriorityFeePerGas: 1n,
        maxFeePerGas: 201n,
        estimatedTransferWei: 201n * 21000n
      },
      {
        label: "standard",
        baseFee: 100n,
        maxPriorityFeePerGas: 2n,
        maxFeePerGas: 202n,
        estimatedTransferWei: 202n * 21000n
      },
      {
        label: "fast",
        baseFee: 100n,
        maxPriorityFeePerGas: 5n,
        maxFeePerGas: 205n,
        estimatedTransferWei: 205n * 21000n
      }
    ],
    baseFeeHistory: [80n, 90n, 95n, 100n],
    fallback: false
  }
}

async function flushAsync(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

describe("GasOracleViewModel", () => {
  it("refresh() flips to success with snapshot data", async () => {
    const repo = new FakeRepo()
    repo.next = makeSnapshot()
    const { vm } = makeVm(repo)
    vm.refresh()
    await flushAsync()
    const state = vm.snapshot$.value
    expect(state.status).toBe("success")
    if (state.status === "success") {
      expect(state.data.tiers).toHaveLength(3)
    }
  })

  it("setChain triggers a refresh when chain changes", async () => {
    const repo = new FakeRepo()
    repo.next = makeSnapshot()
    const { vm } = makeVm(repo)
    expect(repo.calls).toBe(0)
    vm.setChain(Chain.EVM_POLYGON_AMOY)
    await flushAsync()
    expect(repo.calls).toBe(1)
    vm.setChain(Chain.EVM_POLYGON_AMOY) // same chain — no-op
    await flushAsync()
    expect(repo.calls).toBe(1)
  })

  it("preserves last success on a subsequent failure", async () => {
    const repo = new FakeRepo()
    repo.next = makeSnapshot()
    const { vm } = makeVm(repo)
    vm.refresh()
    await flushAsync()
    repo.next = null
    repo.error = new Error("rpc down")
    vm.refresh()
    await flushAsync()
    const state = vm.snapshot$.value
    expect(state.status).toBe("success")
  })

  it("currentTier() returns the selected tier from the snapshot", async () => {
    const repo = new FakeRepo()
    repo.next = makeSnapshot()
    const { vm } = makeVm(repo)
    vm.refresh()
    await flushAsync()
    expect(vm.currentTier()?.label).toBe("standard")
    vm.setSelectedTier("fast")
    expect(vm.currentTier()?.label).toBe("fast")
    expect(vm.currentTier()?.maxPriorityFeePerGas).toBe(5n)
  })

  it("setGasLimit clamps below min and above max", () => {
    const repo = new FakeRepo()
    repo.next = makeSnapshot()
    const { vm } = makeVm(repo)
    vm.setGasLimit(0n)
    expect(vm.gasLimit$.value).toBe(vm.minGasLimit)
    vm.setGasLimit(99_999_999n)
    expect(vm.gasLimit$.value).toBe(vm.maxGasLimit)
    vm.setGasLimit(50_000n)
    expect(vm.gasLimit$.value).toBe(50_000n)
  })

  it("totalCostUsd$ reflects tier × limit × hardcoded USD rate", async () => {
    const repo = new FakeRepo()
    repo.next = makeSnapshot()
    const { vm } = makeVm(repo)
    vm.refresh()
    await flushAsync()
    // standard tier maxFeePerGas = 202 wei, gasLimit = 21000, USD/ETH = 3000
    // wei = 202 * 21000 = 4,242,000 → native ETH = 4.242e-12 → usd = 1.2726e-8
    const usd = vm.totalCostUsd$.value
    expect(usd).not.toBeNull()
    expect(usd!).toBeCloseTo((202 * 21000 * 3000) / 1e18, 12)
    vm.setGasLimit(50_000n)
    const usd2 = vm.totalCostUsd$.value
    expect(usd2!).toBeCloseTo((202 * 50_000 * 3000) / 1e18, 12)
  })

  it("refresh writes a sample into the history repo", async () => {
    const repo = new FakeRepo()
    repo.next = makeSnapshot()
    const { vm, history } = makeVm(repo)
    vm.refresh()
    await flushAsync()
    expect(history.samples).toHaveLength(1)
    expect(history.samples[0]!.tiers).toHaveLength(3)
  })
})
