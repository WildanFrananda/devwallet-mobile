import OnboardingViewModel from "../src/viewmodels/OnboardingViewModel"

describe("OnboardingViewModel", () => {
  it("starts in idle state", () => {
    const vm = new OnboardingViewModel()
    expect(vm.walletState$.value.status).toBe("idle")
  })

  it("transitions through loading then success on generateMnemonic", async () => {
    const vm = new OnboardingViewModel()
    vm.generateMnemonic()
    expect(vm.walletState$.value.status).toBe("loading")
    await new Promise<void>(resolve => setTimeout(() => resolve(), 10))
    expect(vm.walletState$.value.status).toBe("success")
  })
})
