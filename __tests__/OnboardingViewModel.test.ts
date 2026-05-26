import "reflect-metadata"
import OnboardingViewModel from "../src/viewmodels/OnboardingViewModel"
import WalletRepositoryImpl from "../src/repositories/wallet.repository.impl"
import KeyringService from "../src/core/crypto/keyring/keyring.service"
import KeychainService from "../src/core/storage/keychain.service"

const keychainState: { mnemonic: string | null } = { mnemonic: null }

jest.mock("react-native-keychain", () => ({
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: "x" },
  ACCESS_CONTROL: { BIOMETRY_ANY_OR_DEVICE_PASSCODE: "x" },
  setGenericPassword: jest.fn((_user: string, password: string) => {
    keychainState.mnemonic = password
    return Promise.resolve({ service: "mock" })
  }),
  getGenericPassword: jest.fn(() =>
    Promise.resolve(keychainState.mnemonic ? { username: "primary", password: keychainState.mnemonic } : false)
  ),
  resetGenericPassword: jest.fn(() => {
    keychainState.mnemonic = null
    return Promise.resolve(true)
  }),
  getSupportedBiometryType: jest.fn().mockResolvedValue(null)
}))

function makeVm(): OnboardingViewModel {
  const wallet = new WalletRepositoryImpl(new KeyringService(), new KeychainService())
  return new OnboardingViewModel(wallet)
}

describe("OnboardingViewModel", () => {
  beforeEach(() => {
    keychainState.mnemonic = null
  })

  it("starts idle on all state flows", () => {
    const vm = makeVm()
    expect(vm.mnemonic$.value.status).toBe("idle")
    expect(vm.verify$.value).toBeNull()
    expect(vm.persist$.value.status).toBe("idle")
  })

  it("generate() produces a 12-word success state", () => {
    const vm = makeVm()
    vm.generate(128)
    const state = vm.mnemonic$.value
    expect(state.status).toBe("success")
    if (state.status === "success") {
      expect(state.data).toHaveLength(12)
    }
  })

  it("prepareVerify picks 3 distinct sorted indices", () => {
    const vm = makeVm()
    vm.generate(128)
    vm.prepareVerify()
    const c = vm.verify$.value
    expect(c).not.toBeNull()
    if (c) {
      expect(c.indices).toHaveLength(3)
      expect(new Set(c.indices).size).toBe(3)
      expect([...c.indices]).toEqual([...c.indices].sort((a, b) => a - b))
      expect(c.expected).toHaveLength(3)
    }
  })

  it("submitVerify with correct answers persists wallet and reaches success", async () => {
    const vm = makeVm()
    vm.generate(128)
    vm.prepareVerify()
    const c = vm.verify$.value
    expect(c).not.toBeNull()
    if (!c) return

    vm.submitVerify(c.expected, false)
    expect(vm.persist$.value.status).toBe("loading")

    for (let i = 0; i < 50; i++) {
      if (vm.persist$.value.status !== "loading") break
      await new Promise<void>(resolve => setTimeout(() => resolve(), 50))
    }
    expect(vm.persist$.value.status).toBe("success")
  }, 10000)

  it("submitVerify with wrong answers errors out", () => {
    const vm = makeVm()
    vm.generate(128)
    vm.prepareVerify()
    vm.submitVerify(["wrong", "wrong", "wrong"], false)
    const state = vm.persist$.value
    expect(state.status).toBe("error")
    if (state.status === "error") {
      expect(state.message).toMatch(/don't match/i)
    }
  })

  it("submitRestore with valid 12-word phrase persists wallet", async () => {
    const vm = makeVm()
    const TEST = "test test test test test test test test test test test junk"
    vm.submitRestore(TEST, false)
    expect(vm.persist$.value.status).toBe("loading")
    for (let i = 0; i < 50; i++) {
      if (vm.persist$.value.status !== "loading") break
      await new Promise<void>(resolve => setTimeout(() => resolve(), 50))
    }
    expect(vm.persist$.value.status).toBe("success")
  }, 10000)

  it("submitRestore rejects wrong word count", () => {
    const vm = makeVm()
    vm.submitRestore("only three words", false)
    const state = vm.persist$.value
    expect(state.status).toBe("error")
    if (state.status === "error") {
      expect(state.message).toMatch(/12 or 24/)
    }
  })

  it("submitRestore rejects invalid checksum", async () => {
    const vm = makeVm()
    vm.submitRestore("test test test test test test test test test test test test", false)
    for (let i = 0; i < 50; i++) {
      if (vm.persist$.value.status !== "loading") break
      await new Promise<void>(resolve => setTimeout(() => resolve(), 50))
    }
    const state = vm.persist$.value
    expect(state.status).toBe("error")
    if (state.status === "error") {
      expect(state.message).toMatch(/Invalid mnemonic/i)
    }
  }, 10000)

  it("reset clears all state", () => {
    const vm = makeVm()
    vm.generate(128)
    vm.prepareVerify()
    vm.reset()
    expect(vm.mnemonic$.value.status).toBe("idle")
    expect(vm.verify$.value).toBeNull()
    expect(vm.persist$.value.status).toBe("idle")
  })
})
