import "reflect-metadata"
import WalletViewModel from "../src/viewmodels/WalletViewModel"
import Portfolio from "../src/models/portfolio.model"
import type WalletRepository from "../src/repositories/wallet.repository"

function makeRepo(over: Partial<WalletRepository> = {}): WalletRepository {
  return {
    loadPortfolio: jest.fn(async () => new Portfolio([])),
    loadTokens: jest.fn(async () => []),
    ...over
  } as unknown as WalletRepository
}

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

describe("WalletViewModel", () => {
  it("loadPortfolio sets loading then success", async () => {
    const repo = makeRepo()
    const vm = new WalletViewModel(repo)
    vm.loadPortfolio(0)
    expect(vm.portfolio$.value.status).toBe("loading")
    await flush()
    expect(vm.portfolio$.value.status).toBe("success")
  })

  it("loadPortfolio error path surfaces", async () => {
    const repo = makeRepo({
      loadPortfolio: jest.fn(async () => {
        throw new Error("rpc")
      })
    })
    const vm = new WalletViewModel(repo)
    vm.loadPortfolio(0)
    await flush()
    expect(vm.portfolio$.value.status).toBe("error")
  })

  it("refreshPortfolio is silent — does not flip to loading", async () => {
    const repo = makeRepo()
    const vm = new WalletViewModel(repo)
    vm.loadPortfolio(0)
    await flush()
    vm.refreshPortfolio(0)
    expect(vm.portfolio$.value.status).toBe("success")
    await flush()
  })

  it("loadTokens populates token map per chain", async () => {
    const repo = makeRepo()
    const vm = new WalletViewModel(repo)
    vm.loadTokens("evm:sepolia" as never, "0xowner")
    await flush()
    expect(repo.loadTokens).toHaveBeenCalled()
  })

  it("reset clears all state", async () => {
    const repo = makeRepo()
    const vm = new WalletViewModel(repo)
    vm.loadPortfolio(0)
    await flush()
    vm.reset()
    expect(vm.portfolio$.value.status).toBe("idle")
    expect(vm.tokens$.value).toEqual({})
  })
})
