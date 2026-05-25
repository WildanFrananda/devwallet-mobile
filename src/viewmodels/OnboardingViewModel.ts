import { StateFlow, UiState, ViewModel } from "react-native-mobile-mvvm"

type WalletDraft = {
  mnemonic: string
}

class OnboardingViewModel extends ViewModel {
  private readonly _walletState = new StateFlow<UiState<WalletDraft>>(UiState.idle())
  public readonly walletState$ = this._walletState.asReadOnly()

  public generateMnemonic(): void {
    // Phase 1 will replace this with real BIP39 derivation via KeyringService.
    this._walletState.value = UiState.loading()
    void this.launch(async signal => {
      await new Promise<void>(resolve => setTimeout(() => resolve(), 0))
      if (signal.aborted) return
      this._walletState.value = UiState.success({ mnemonic: "" })
    })
  }
}

export default OnboardingViewModel
