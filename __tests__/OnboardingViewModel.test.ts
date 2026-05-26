import "reflect-metadata"
import OnboardingViewModel from "../src/viewmodels/OnboardingViewModel"
import KeyringService from "../src/core/crypto/keyring/keyring.service"

describe("OnboardingViewModel", () => {
  it("starts in idle state", () => {
    const vm = new OnboardingViewModel(new KeyringService())
    expect(vm.report$.value.status).toBe("idle")
  })

  it("transitions idle → loading → success after runPoc()", async () => {
    const vm = new OnboardingViewModel(new KeyringService())
    vm.runPoc()
    expect(vm.report$.value.status).toBe("loading")

    for (let i = 0; i < 50; i++) {
      if (vm.report$.value.status !== "loading") break
      await new Promise<void>(resolve => setTimeout(() => resolve(), 50))
    }

    expect(vm.report$.value.status).toBe("success")
  }, 10000)
})
