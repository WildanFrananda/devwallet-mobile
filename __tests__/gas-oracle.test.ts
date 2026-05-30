import "reflect-metadata"
import { Chain } from "../src/core/constants/chains.enum"
import type GasRepository from "../src/repositories/gas.repository"
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
    baseFeeHistory: [80n, 90n, 95n, 100n]
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
    const vm = new GasOracleViewModel(repo)
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
    const vm = new GasOracleViewModel(repo)
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
    const vm = new GasOracleViewModel(repo)
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
    const vm = new GasOracleViewModel(repo)
    vm.refresh()
    await flushAsync()
    expect(vm.currentTier()?.label).toBe("standard")
    vm.setSelectedTier("fast")
    expect(vm.currentTier()?.label).toBe("fast")
    expect(vm.currentTier()?.maxPriorityFeePerGas).toBe(5n)
  })
})
