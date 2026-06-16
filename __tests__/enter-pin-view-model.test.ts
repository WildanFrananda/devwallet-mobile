import "reflect-metadata"
import EnterPinViewModel from "../src/viewmodels/EnterPinViewModel"
import Account from "../src/models/account.model"
import { Chain } from "../src/core/constants/chains.enum"
import type WalletRepository from "../src/repositories/wallet.repository"
import type PinService from "../src/core/auth/pin.service"

function makeAccount(): Account {
  return new Account({
    chain: Chain.EVM_SEPOLIA,
    address: "0xtest",
    privateKey: "0xpriv",
    publicKey: "0xpub",
    path: "m",
    index: 0
  })
}

function makeVm(over: {
  unlock?: jest.Mock
  isLockedOut?: jest.Mock
} = {}): {
  vm: EnterPinViewModel
  wallet: jest.Mocked<WalletRepository>
  pin: jest.Mocked<PinService>
} {
  const wallet = {
    unlock: over.unlock ?? jest.fn(async () => makeAccount())
  } as unknown as jest.Mocked<WalletRepository>
  const pin = {
    isLockedOut: over.isLockedOut ?? jest.fn(() => false),
    getLockoutRemainingMs: jest.fn(() => 0),
    getLockoutMsRemaining: jest.fn(() => 0),
    getAttemptsLeft: jest.fn(() => 5),
    getRemainingAttempts: jest.fn(() => 5),
    getLockoutMs: jest.fn(() => 0)
  } as unknown as jest.Mocked<PinService>
  return { vm: new EnterPinViewModel(wallet, pin), wallet, pin }
}

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

describe("EnterPinViewModel", () => {
  it("setPin sanitises non-digit + caps at 6", () => {
    const { vm } = makeVm()
    vm.setPin("12abc34567")
    expect(vm.pin$.value).toBe("123456")
  })

  it("submit error when pin not 6 digits", () => {
    const { vm } = makeVm()
    vm.setPin("123")
    vm.submit()
    expect(vm.state$.value.status).toBe("error")
  })

  it("submit success unlocks + emits", async () => {
    const { vm, wallet } = makeVm()
    vm.setPin("123456")
    vm.submit()
    await flush()
    expect(wallet.unlock).toHaveBeenCalledWith("pin", "123456")
    expect(vm.state$.value.status).toBe("success")
  })

  it("submit failure clears pin + sets error", async () => {
    const { vm } = makeVm({
      unlock: jest.fn(async () => {
        throw new Error("wrong pin")
      })
    })
    vm.setPin("000000")
    vm.submit()
    await flush()
    expect(vm.state$.value.status).toBe("error")
    expect(vm.pin$.value).toBe("")
  })

  it("submit short-circuits when locked out", () => {
    const { vm, wallet } = makeVm({
      isLockedOut: jest.fn(() => true)
    })
    vm.setPin("123456")
    vm.submit()
    expect(wallet.unlock).not.toHaveBeenCalled()
  })

  it("setPin clears existing error", () => {
    const { vm } = makeVm()
    vm.setPin("123")
    vm.submit()
    expect(vm.state$.value.status).toBe("error")
    vm.setPin("123456")
    expect(vm.state$.value.status).toBe("idle")
  })
})
