import "reflect-metadata"
import PinSetupViewModel from "../src/viewmodels/PinSetupViewModel"
import type PinService from "../src/core/auth/pin.service"
import type WalletRepository from "../src/repositories/wallet.repository"

function makeVm(
  pinOver: Partial<PinService> = {},
  walletOver: Partial<WalletRepository> = {}
): { vm: PinSetupViewModel; pin: jest.Mocked<PinService>; wallet: jest.Mocked<WalletRepository> } {
  const pin = {
    setPin: jest.fn(async () => undefined),
    ...pinOver
  } as unknown as jest.Mocked<PinService>
  const wallet = {
    persistEncrypted: jest.fn(async () => undefined),
    ...walletOver
  } as unknown as jest.Mocked<WalletRepository>
  return { vm: new PinSetupViewModel(pin, wallet), pin, wallet }
}

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

describe("PinSetupViewModel", () => {
  it("sanitises non-digit input", () => {
    const { vm } = makeVm()
    vm.setCreateValue("12a3b4c5d6e")
    expect(vm.createValue$.value).toBe("123456")
  })

  it("advanceToConfirm rejects invalid PIN length", () => {
    const { vm } = makeVm()
    vm.setCreateValue("123")
    vm.advanceToConfirm()
    const state = vm.save$.value
    expect(state.status).toBe("error")
    expect(vm.stage$.value).toBe("create")
  })

  it("advanceToConfirm transitions stage when valid", () => {
    const { vm } = makeVm()
    vm.setCreateValue("123456")
    vm.advanceToConfirm()
    expect(vm.stage$.value).toBe("confirm")
  })

  it("back() resets to create stage + clears confirm + clears error", () => {
    const { vm } = makeVm()
    vm.setCreateValue("123456")
    vm.advanceToConfirm()
    vm.setConfirmValue("999999")
    vm.back()
    expect(vm.stage$.value).toBe("create")
    expect(vm.confirmValue$.value).toBe("")
  })

  it("submit rejects when create + confirm differ", () => {
    const { vm } = makeVm()
    vm.setCreateValue("111111")
    vm.advanceToConfirm()
    vm.setConfirmValue("222222")
    vm.submit()
    const state = vm.save$.value
    expect(state.status).toBe("error")
    if (state.status === "error") expect(state.message).toMatch(/match/i)
  })

  it("submit persists pin + encrypted wallet on match", async () => {
    const { vm, pin, wallet } = makeVm()
    vm.setCreateValue("123456")
    vm.advanceToConfirm()
    vm.setConfirmValue("123456")
    vm.submit()
    await flush()
    expect(pin.setPin).toHaveBeenCalledWith("123456")
    expect(wallet.persistEncrypted).toHaveBeenCalledWith("123456")
    expect(vm.save$.value.status).toBe("success")
  })

  it("submit surfaces error from wallet.persistEncrypted", async () => {
    const { vm } = makeVm(
      {},
      {
        persistEncrypted: jest.fn(async () => {
          throw new Error("keychain locked")
        })
      }
    )
    vm.setCreateValue("123456")
    vm.advanceToConfirm()
    vm.setConfirmValue("123456")
    vm.submit()
    await flush()
    const state = vm.save$.value
    expect(state.status).toBe("error")
    if (state.status === "error") expect(state.message).toMatch(/keychain/)
  })

  it("setCreateValue clears existing error", () => {
    const { vm } = makeVm()
    vm.setCreateValue("123")
    vm.advanceToConfirm()
    expect(vm.save$.value.status).toBe("error")
    vm.setCreateValue("123456")
    expect(vm.save$.value.status).toBe("idle")
  })
})
