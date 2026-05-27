import "reflect-metadata"
import { Subject } from "rxjs"
import FaucetViewModel from "../src/viewmodels/FaucetViewModel"
import type WalletRepository from "../src/repositories/wallet.repository"
import FaucetRequest from "../src/models/faucet-request.model"
import { FaucetRateLimitError } from "../src/datasources/faucet/faucet.datasource"
import { Chain } from "../src/core/constants/chains.enum"
import type Account from "../src/models/account.model"

function makeAccount(chain: Chain, address: string): Account {
  return {
    chain,
    address,
    privateKey: "0x" + "00".repeat(32),
    publicKey: "0x" + "00".repeat(33),
    path: "m/44'/60'/0'/0/0",
    index: 0
  } as Account
}

describe("FaucetViewModel", () => {
  let events$: Subject<unknown>
  let faucet: { enqueue: jest.Mock; fetchStatus: jest.Mock; events$: jest.Mock }
  let wallet: { deriveAll: jest.Mock }
  let vm: FaucetViewModel

  beforeEach(() => {
    events$ = new Subject()
    faucet = {
      enqueue: jest.fn(),
      fetchStatus: jest.fn(),
      events$: jest.fn().mockReturnValue(events$.asObservable())
    }
    wallet = {
      deriveAll: jest.fn().mockResolvedValue([
        makeAccount(Chain.EVM_SEPOLIA, "0xsep"),
        makeAccount(Chain.XRPL_TESTNET, "rXRP")
      ])
    }
    vm = new FaucetViewModel(faucet, wallet as unknown as WalletRepository)
  })

  it("initialize loads chain addresses then sets success state", async () => {
    vm.initialize(0)
    await new Promise(r => setTimeout(r, 20))
    const addrState = vm.addresses$.value
    expect(addrState.status).toBe("success")
    if (addrState.status === "success") {
      expect(addrState.data[Chain.EVM_SEPOLIA]).toBe("0xsep")
    }
  })

  it("requestAll: optimistic pending → repository resolves → rows updated", async () => {
    vm.initialize(0)
    await new Promise(r => setTimeout(r, 20))

    faucet.enqueue.mockResolvedValue([
      new FaucetRequest({
        id: "r-1", chain: Chain.EVM_SEPOLIA, address: "0xsep",
        status: "pending", txHash: null, amount: null, errorMessage: null, manualUrl: null, completedAt: null
      })
    ])

    vm.requestAll()
    // Optimistic — pending immediately
    expect(vm.rows$.value[Chain.EVM_SEPOLIA]?.status).toBe("pending")
    await new Promise(r => setTimeout(r, 20))
    expect(vm.rows$.value[Chain.EVM_SEPOLIA]?.requestId).toBe("r-1")
  })

  it("WS faucet.success event transitions row to completed with tx + amount", async () => {
    vm.initialize(0)
    await new Promise(r => setTimeout(r, 20))
    events$.next({
      type: "faucet.success",
      requestId: "r-2",
      chain: Chain.EVM_SEPOLIA,
      address: "0xsep",
      txHash: "0xhash",
      amount: "0.005"
    })
    const row = vm.rows$.value[Chain.EVM_SEPOLIA]
    expect(row?.status).toBe("completed")
    expect(row?.txHash).toBe("0xhash")
    expect(row?.amount).toBe("0.005")
  })

  it("WS faucet.failed event sets error + manualUrl", async () => {
    vm.initialize(0)
    await new Promise(r => setTimeout(r, 20))
    events$.next({
      type: "faucet.failed",
      requestId: "r-3",
      chain: Chain.BITCOIN_TESTNET,
      address: "tb1q",
      error: "captcha required",
      manualUrl: "https://faucet.example/?to=tb1q"
    })
    const row = vm.rows$.value[Chain.BITCOIN_TESTNET]
    expect(row?.status).toBe("failed")
    expect(row?.errorMessage).toBe("captcha required")
    expect(row?.manualUrl).toBe("https://faucet.example/?to=tb1q")
  })

  it("rate-limit error from API sets row failed with rateLimitedUntilMs", async () => {
    vm.initialize(0)
    await new Promise(r => setTimeout(r, 20))
    faucet.enqueue.mockRejectedValue(
      new FaucetRateLimitError(Chain.EVM_SEPOLIA, 3600, "rate limited 3600s")
    )
    vm.requestSingle(Chain.EVM_SEPOLIA)
    await new Promise(r => setTimeout(r, 20))
    const row = vm.rows$.value[Chain.EVM_SEPOLIA]
    expect(row?.status).toBe("failed")
    expect(row?.rateLimitedUntilMs).toBeGreaterThan(Date.now())
  })

  it("ignores unknown event types", async () => {
    vm.initialize(0)
    await new Promise(r => setTimeout(r, 20))
    events$.next({ type: "unknown.thing", requestId: "x", chain: Chain.EVM_SEPOLIA })
    const row = vm.rows$.value[Chain.EVM_SEPOLIA]
    expect(row).toBeUndefined()
  })
})
