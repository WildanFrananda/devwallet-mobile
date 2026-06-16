import "reflect-metadata"
import SendViewModel from "../src/viewmodels/SendViewModel"
import { Chain } from "../src/core/constants/chains.enum"
import type WalletRepository from "../src/repositories/wallet.repository"
import type FeeDatasource from "../src/datasources/fee/fee.datasource"
import type GasRepository from "../src/repositories/gas.repository"

function makeStubs(over: {
  sendTx?: jest.Mock
  waitForConfirmation?: jest.Mock
  loadPortfolio?: jest.Mock
  fetchOracle?: jest.Mock
} = {}): {
  vm: SendViewModel
  wallet: jest.Mocked<WalletRepository>
  fees: jest.Mocked<FeeDatasource>
  gas: jest.Mocked<GasRepository>
} {
  const wallet = {
    sendTx: over.sendTx ?? jest.fn(async () => ({ hash: "0xtx" })),
    waitForConfirmation:
      over.waitForConfirmation ??
      jest.fn(async () => ({
        hash: "0xtx",
        blockNumber: 100
      })),
    loadPortfolio: over.loadPortfolio ?? jest.fn(async () => ({ entries: [] }))
  } as unknown as jest.Mocked<WalletRepository>
  const fees = {
    estimateNativeFee: jest.fn(async () => 1n)
  } as unknown as jest.Mocked<FeeDatasource>
  const gas = {
    fetchOracle: over.fetchOracle ?? jest.fn(async () => ({ tiers: [] }))
  } as unknown as jest.Mocked<GasRepository>
  return { vm: new SendViewModel(wallet, fees, gas), wallet, fees, gas }
}

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

describe("SendViewModel", () => {
  it("bind sets chain + from address", () => {
    const { vm } = makeStubs()
    vm.bind(Chain.EVM_SEPOLIA, "0xme")
    expect(vm.canSubmit$.value).toBe(false)
  })

  it("setRecipient + setAmount affect canSubmit$", () => {
    const { vm } = makeStubs()
    vm.bind(Chain.EVM_SEPOLIA, "0xme")
    vm.setRecipient("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")
    vm.setAmount("0.001")
    expect(vm.canSubmit$.value).toBe(true)
  })

  it("submit fails without bind", () => {
    const { vm } = makeStubs()
    vm.submit()
    expect(vm.state$.value.status).toBe("error")
  })

  it("submit with invalid amount surfaces error", () => {
    const { vm } = makeStubs()
    vm.bind(Chain.EVM_SEPOLIA, "0xme")
    vm.setRecipient("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")
    vm.setAmount("not-a-number")
    vm.submit()
    expect(vm.state$.value.status).toBe("error")
  })

  it("submit happy path reaches success with receipt", async () => {
    const { vm } = makeStubs()
    vm.bind(Chain.EVM_SEPOLIA, "0xme")
    vm.setRecipient("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")
    vm.setAmount("0.001")
    vm.submit()
    expect(vm.state$.value.status).toBe("loading")
    await flush()
    await flush()
    expect(vm.state$.value.status).toBe("success")
  })

  it("submit error surfaces from wallet.sendTx rejection", async () => {
    const { vm } = makeStubs({
      sendTx: jest.fn(async () => {
        throw new Error("nonce")
      })
    })
    vm.bind(Chain.EVM_SEPOLIA, "0xme")
    vm.setRecipient("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")
    vm.setAmount("0.001")
    vm.submit()
    await flush()
    expect(vm.state$.value.status).toBe("error")
  })

  it("setSelectedTier updates selectedTier$", () => {
    const { vm } = makeStubs()
    vm.setSelectedTier("fast")
    expect(vm.selectedTier$.value).toBe("fast")
  })

  it("loadGasTiers skips non-EVM chains", () => {
    const { vm, gas } = makeStubs()
    vm.bind(Chain.BITCOIN_TESTNET, "addr")
    vm.loadGasTiers()
    expect(gas.fetchOracle).not.toHaveBeenCalled()
    expect(vm.gasTiers$.value).toEqual([])
  })

  it("loadGasTiers calls oracle for EVM chains", async () => {
    const { vm, gas } = makeStubs({
      fetchOracle: jest.fn(async () => ({
        tiers: [
          {
            label: "standard",
            maxFeePerGas: 100n,
            maxPriorityFeePerGas: 1n,
            baseFee: 99n,
            estimatedTransferWei: 100n
          }
        ]
      }))
    })
    vm.bind(Chain.EVM_SEPOLIA, "0xme")
    vm.loadGasTiers()
    await flush()
    expect(gas.fetchOracle).toHaveBeenCalled()
  })

  it("reset clears recipient + amount + state", async () => {
    const { vm } = makeStubs()
    vm.bind(Chain.EVM_SEPOLIA, "0xme")
    vm.setRecipient("0xrec")
    vm.setAmount("0.5")
    vm.reset()
    expect(vm.recipient$.value).toBe("")
    expect(vm.amount$.value).toBe("")
    expect(vm.state$.value.status).toBe("idle")
  })
})
