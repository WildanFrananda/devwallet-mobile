import "reflect-metadata"
import TxHistoryViewModel, { PAGE_SIZE } from "../src/viewmodels/TxHistoryViewModel"
import Transaction from "../src/models/transaction.model"
import { Chain } from "../src/core/constants/chains.enum"
import type WalletRepository from "../src/repositories/wallet.repository"

function makeTx(hash: string, status: Transaction["status"] = "success"): Transaction {
  return new Transaction({
    chain: Chain.EVM_SEPOLIA,
    hash,
    from: "0xfrom",
    to: "0xto",
    value: 0n,
    status
  })
}

function makeBigList(count: number): Transaction[] {
  return Array.from({ length: count }, (_, i) => makeTx(`tx-${i}`))
}

function makeRepo(impl: jest.Mock): WalletRepository {
  return { loadTxHistory: impl } as unknown as WalletRepository
}

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

describe("TxHistoryViewModel", () => {
  it("load() fetches first page + sets hasMore when at page size", async () => {
    const repo = makeRepo(jest.fn(async () => makeBigList(PAGE_SIZE)))
    const vm = new TxHistoryViewModel(repo)
    vm.load(Chain.EVM_SEPOLIA, "0xowner")
    expect(vm.state$.value.status).toBe("loading")
    await flush()
    expect(vm.state$.value.status).toBe("success")
    expect(vm.hasMore$.value).toBe(true)
  })

  it("load() does not set hasMore when fewer than page size returned", async () => {
    const repo = makeRepo(jest.fn(async () => makeBigList(5)))
    const vm = new TxHistoryViewModel(repo)
    vm.load(Chain.EVM_SEPOLIA, "0xowner")
    await flush()
    expect(vm.hasMore$.value).toBe(false)
  })

  it("load() error surfaces in state", async () => {
    const repo = makeRepo(
      jest.fn(async () => {
        throw new Error("rpc down")
      })
    )
    const vm = new TxHistoryViewModel(repo)
    vm.load(Chain.EVM_SEPOLIA, "0xowner")
    await flush()
    const state = vm.state$.value
    expect(state.status).toBe("error")
    if (state.status === "error") expect(state.message).toMatch(/rpc down/)
  })

  it("loadMore() appends fresh items + advances page when hasMore", async () => {
    const repo = makeRepo(
      jest.fn(async (_chain, _addr, limit: number) => makeBigList(limit))
    )
    const vm = new TxHistoryViewModel(repo)
    vm.load(Chain.EVM_SEPOLIA, "0xowner")
    await flush()
    vm.loadMore()
    expect(vm.loadingMore$.value).toBe(true)
    await flush()
    expect(vm.page$.value).toBe(2)
    expect(vm.loadingMore$.value).toBe(false)
  })

  it("loadMore() no-op when not bound", () => {
    const vm = new TxHistoryViewModel(makeRepo(jest.fn()))
    vm.loadMore()
    // No throw → pass
    expect(vm.loadingMore$.value).toBe(false)
  })

  it("filteredItems$ narrows by status filter", async () => {
    const repo = makeRepo(
      jest.fn(async () => [
        makeTx("a", "success"),
        makeTx("b", "pending"),
        makeTx("c", "failed")
      ])
    )
    const vm = new TxHistoryViewModel(repo)
    vm.load(Chain.EVM_SEPOLIA, "0xowner")
    await flush()
    expect(vm.filteredItems$.value).toHaveLength(3)
    vm.setFilter("failed")
    expect(vm.filteredItems$.value).toHaveLength(1)
    expect(vm.filteredItems$.value[0]!.hash).toBe("c")
  })
})
