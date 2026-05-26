import "reflect-metadata"
import OnboardingViewModel from "../src/viewmodels/OnboardingViewModel"
import WalletRepositoryImpl from "../src/repositories/wallet.repository.impl"
import KeyringService from "../src/core/crypto/keyring/keyring.service"
import KeychainService from "../src/core/storage/keychain.service"

jest.mock("react-native-keychain", () => ({
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY" },
  ACCESS_CONTROL: { BIOMETRY_ANY_OR_DEVICE_PASSCODE: "BIOMETRY_ANY_OR_DEVICE_PASSCODE" },
  setGenericPassword: jest.fn().mockResolvedValue({ service: "test" }),
  getGenericPassword: jest.fn().mockResolvedValue(false),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
  getSupportedBiometryType: jest.fn().mockResolvedValue(null)
}))

function makeVm(): OnboardingViewModel {
  const wallet = new WalletRepositoryImpl(new KeyringService(), new KeychainService())
  return new OnboardingViewModel(wallet)
}

describe("OnboardingViewModel", () => {
  it("starts in idle state", () => {
    const vm = makeVm()
    expect(vm.report$.value.status).toBe("idle")
  })

  it("transitions idle → loading → success after runPoc()", async () => {
    const vm = makeVm()
    vm.runPoc()
    expect(vm.report$.value.status).toBe("loading")

    for (let i = 0; i < 50; i++) {
      if (vm.report$.value.status !== "loading") break
      await new Promise<void>(resolve => setTimeout(() => resolve(), 50))
    }

    expect(vm.report$.value.status).toBe("success")
  }, 10000)
})
