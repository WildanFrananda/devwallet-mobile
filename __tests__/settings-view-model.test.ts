import "reflect-metadata"
import SettingsViewModel from "../src/viewmodels/SettingsViewModel"
import type SettingsService from "../src/core/storage/settings.service"
import type AutoLockService from "../src/core/lifecycle/auto-lock.service"
import type PinService from "../src/core/auth/pin.service"

function makeVm(): {
  vm: SettingsViewModel
  settings: jest.Mocked<SettingsService>
  autoLock: jest.Mocked<AutoLockService>
  pin: jest.Mocked<PinService>
  } {
  const settings = {
    getAutoLockMs: jest.fn(() => 30_000),
    getUseBiometric: jest.fn(() => true),
    setAutoLockMs: jest.fn(),
    setUseBiometric: jest.fn()
  } as unknown as jest.Mocked<SettingsService>
  const autoLock = {
    setLockAfter: jest.fn(),
    lockNow: jest.fn()
  } as unknown as jest.Mocked<AutoLockService>
  const pin = {
    changePin: jest.fn(async () => undefined)
  } as unknown as jest.Mocked<PinService>
  return { vm: new SettingsViewModel(settings, autoLock, pin), settings, autoLock, pin }
}

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

describe("SettingsViewModel", () => {
  it("seeds streams from settings on construction", () => {
    const { vm } = makeVm()
    expect(vm.autoLockMs$.value).toBe(30_000)
    expect(vm.useBiometric$.value).toBe(true)
    expect(vm.changePin$.value.status).toBe("idle")
  })

  it("setAutoLockMs persists + updates auto-lock service + emits", () => {
    const { vm, settings, autoLock } = makeVm()
    vm.setAutoLockMs(60_000)
    expect(settings.setAutoLockMs).toHaveBeenCalledWith(60_000)
    expect(autoLock.setLockAfter).toHaveBeenCalledWith(60_000)
    expect(vm.autoLockMs$.value).toBe(60_000)
  })

  it("setUseBiometric persists + flips flag", () => {
    const { vm, settings } = makeVm()
    vm.setUseBiometric(false)
    expect(settings.setUseBiometric).toHaveBeenCalledWith(false)
    expect(vm.useBiometric$.value).toBe(false)
  })

  it("changePin success transitions through loading → success", async () => {
    const { vm, pin } = makeVm()
    vm.changePin("111111", "222222")
    expect(vm.changePin$.value.status).toBe("loading")
    await flush()
    expect(pin.changePin).toHaveBeenCalledWith("111111", "222222")
    expect(vm.changePin$.value.status).toBe("success")
  })

  it("lockNow delegates to auto-lock service", () => {
    const { vm, autoLock } = makeVm()
    vm.lockNow()
    expect(autoLock.lockNow).toHaveBeenCalled()
  })

  it("changePin error surfaces as error state", async () => {
    const pin = {
      changePin: jest.fn(async () => {
        throw new Error("wrong current PIN")
      })
    } as unknown as jest.Mocked<PinService>
    const settings = {
      getAutoLockMs: jest.fn(() => 0),
      getUseBiometric: jest.fn(() => false),
      setAutoLockMs: jest.fn(),
      setUseBiometric: jest.fn()
    } as unknown as jest.Mocked<SettingsService>
    const autoLock = { setLockAfter: jest.fn(), lockNow: jest.fn() } as unknown as jest.Mocked<AutoLockService>
    const vm = new SettingsViewModel(settings, autoLock, pin)
    vm.changePin("a", "b")
    await flush()
    const state = vm.changePin$.value
    expect(state.status).toBe("error")
    if (state.status === "error") expect(state.message).toMatch(/wrong current/)
  })
})
