import "reflect-metadata"
import { firstValueFrom, take, toArray } from "rxjs"
import GasHistoryRepositoryImpl from "../src/repositories/gas-history.repository.impl"
import { Chain } from "../src/core/constants/chains.enum"
import type { GasSample } from "../src/repositories/gas-history.repository"

const stores: Record<string, Record<string, unknown>> = {}

jest.mock("react-native-mmkv", () => ({
  createMMKV: (opts: { id: string }) => {
    const id = opts.id
    stores[id] = stores[id] ?? {}
    const store = stores[id]
    return {
      getBoolean: (key: string) => store[key] as boolean | undefined,
      getNumber: (key: string) => store[key] as number | undefined,
      getString: (key: string) => store[key] as string | undefined,
      set: (key: string, value: unknown) => {
        store[key] = value
      },
      remove: (key: string) => {
        delete store[key]
      }
    }
  }
}))

function makeSample(chain: Chain, ageMs: number = 0): GasSample {
  const base = 20_000_000_000n
  return {
    chain,
    takenAtIso: new Date(Date.now() - ageMs).toISOString(),
    baseFee: base,
    tiers: [
      {
        label: "slow",
        baseFee: base,
        maxPriorityFeePerGas: 1_000_000_000n,
        maxFeePerGas: 21_000_000_000n,
        estimatedTransferWei: 441_000_000_000_000n
      }
    ]
  }
}

describe("GasHistoryRepository (integration)", () => {
  beforeEach(() => {
    Object.keys(stores).forEach(k => {
      stores[k] = {}
    })
  })

  it("recordIfDue persists sample + survives BigInt round-trip via JSON", () => {
    const repo = new GasHistoryRepositoryImpl()
    const ok = repo.recordIfDue(makeSample(Chain.EVM_SEPOLIA), 1000)
    expect(ok).toBe(true)

    // Fresh instance hits MMKV (in-memory store persists), exercises deserialize path.
    const repo2 = new GasHistoryRepositoryImpl()
    const list = repo2.list(Chain.EVM_SEPOLIA)
    expect(list).toHaveLength(1)
    const sample = list[0]!
    expect(typeof sample.baseFee).toBe("bigint")
    expect(sample.baseFee).toBe(20_000_000_000n)
    expect(sample.tiers[0]!.maxFeePerGas).toBe(21_000_000_000n)
  })

  it("recordIfDue rejects samples inside minSpacingMs window", () => {
    const repo = new GasHistoryRepositoryImpl()
    expect(repo.recordIfDue(makeSample(Chain.EVM_SEPOLIA), 60_000)).toBe(true)
    // Second call within the window: rejected.
    expect(repo.recordIfDue(makeSample(Chain.EVM_SEPOLIA), 60_000)).toBe(false)
    expect(repo.list(Chain.EVM_SEPOLIA)).toHaveLength(1)
  })

  it("caps history at 288 samples (24h @ 5min cadence)", () => {
    const repo = new GasHistoryRepositoryImpl()
    for (let i = 0; i < 300; i++) {
      // Bypass spacing by using 0 — always due.
      repo.recordIfDue(makeSample(Chain.EVM_SEPOLIA, i), 0)
    }
    expect(repo.list(Chain.EVM_SEPOLIA)).toHaveLength(288)
  })

  it("stream$ emits BehaviorSubject snapshot then new sample", async () => {
    const repo = new GasHistoryRepositoryImpl()
    repo.recordIfDue(makeSample(Chain.EVM_POLYGON_AMOY), 0)

    const eventsPromise = firstValueFrom(repo.stream$(Chain.EVM_POLYGON_AMOY).pipe(take(2), toArray()))
    repo.recordIfDue(makeSample(Chain.EVM_POLYGON_AMOY, 10_000), 0)
    const emissions = await eventsPromise

    expect(emissions).toHaveLength(2)
    expect(emissions[0]).toHaveLength(1)
    expect(emissions[1]).toHaveLength(2)
  })

  it("clear empties chain history + notifies stream", async () => {
    const repo = new GasHistoryRepositoryImpl()
    repo.recordIfDue(makeSample(Chain.EVM_BASE_SEPOLIA), 0)
    expect(repo.list(Chain.EVM_BASE_SEPOLIA)).toHaveLength(1)

    const eventsPromise = firstValueFrom(repo.stream$(Chain.EVM_BASE_SEPOLIA).pipe(take(2), toArray()))
    repo.clear(Chain.EVM_BASE_SEPOLIA)
    const emissions = await eventsPromise

    expect(emissions[1]).toHaveLength(0)
    expect(repo.list(Chain.EVM_BASE_SEPOLIA)).toHaveLength(0)
  })

  it("isolates per-chain history (no cross-talk)", () => {
    const repo = new GasHistoryRepositoryImpl()
    repo.recordIfDue(makeSample(Chain.EVM_SEPOLIA), 0)
    repo.recordIfDue(makeSample(Chain.EVM_POLYGON_AMOY), 0)
    expect(repo.list(Chain.EVM_SEPOLIA)).toHaveLength(1)
    expect(repo.list(Chain.EVM_POLYGON_AMOY)).toHaveLength(1)
    expect(repo.list(Chain.EVM_BASE_SEPOLIA)).toHaveLength(0)
  })
})
