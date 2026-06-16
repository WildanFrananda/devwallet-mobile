import "reflect-metadata"
import UnlockViewModel from "../src/viewmodels/UnlockViewModel"
import Account from "../src/models/account.model"
import { Chain } from "../src/core/constants/chains.enum"
import type WalletRepository from "../src/repositories/wallet.repository"

function makeAccount(): Account {
  return new Account({
    chain: Chain.EVM_SEPOLIA,
    address: "0xtest",
    privateKey: "0xpriv",
    publicKey: "0xpub",
    path: "m/44'/60'/0'/0/0",
    index: 0
  })
}

function makeRepo(impl: jest.Mock): WalletRepository {
  return { unlock: impl } as unknown as WalletRepository
}

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

describe("UnlockViewModel", () => {
  it("unlock() flips state to loading then success with default biometric path", async () => {
    const account = makeAccount()
    const unlock = jest.fn(async () => account)
    const vm = new UnlockViewModel(makeRepo(unlock))
    vm.unlock()
    expect(vm.state$.value.status).toBe("loading")
    await flush()
    const state = vm.state$.value
    expect(state.status).toBe("success")
    expect(unlock).toHaveBeenCalledWith("biometric", undefined, "Unlock DevWallet")
  })

  it("unlock() forwards custom prompt message", async () => {
    const unlock = jest.fn(async () => makeAccount())
    const vm = new UnlockViewModel(makeRepo(unlock))
    vm.unlock("Authenticate to send")
    await flush()
    expect(unlock).toHaveBeenCalledWith("biometric", undefined, "Authenticate to send")
  })

  it("unlockWithPin() passes pin via wallet.unlock", async () => {
    const unlock = jest.fn(async () => makeAccount())
    const vm = new UnlockViewModel(makeRepo(unlock))
    vm.unlockWithPin("123456")
    await flush()
    expect(unlock).toHaveBeenCalledWith("pin", "123456", undefined)
  })

  it("error flows surface as error state", async () => {
    const unlock = jest.fn(async () => {
      throw new Error("wrong pin")
    })
    const vm = new UnlockViewModel(makeRepo(unlock))
    vm.unlockWithPin("000000")
    await flush()
    const state = vm.state$.value
    expect(state.status).toBe("error")
    if (state.status === "error") expect(state.message).toMatch(/wrong pin/)
  })

  it("non-Error rejection coerced to string", async () => {
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
    const unlock = jest.fn(() => Promise.reject("raw string"))
    const vm = new UnlockViewModel(makeRepo(unlock))
    vm.unlock()
    await flush()
    const state = vm.state$.value
    expect(state.status).toBe("error")
    if (state.status === "error") expect(state.message).toBe("raw string")
  })

  it("reset() returns state to idle", async () => {
    const unlock = jest.fn(async () => makeAccount())
    const vm = new UnlockViewModel(makeRepo(unlock))
    vm.unlock()
    await flush()
    expect(vm.state$.value.status).toBe("success")
    vm.reset()
    expect(vm.state$.value.status).toBe("idle")
  })
})
