import { inject, injectable } from "tsyringe"
import { StateFlow, UiState, ViewModel } from "react-native-mobile-mvvm"
import KeyringService from "../core/crypto/keyring/keyring.service"
import Bip39 from "../core/crypto/bip39"
import { Tokens } from "../core/di/tokens"
import Account from "../models/account.model"
import { Chain } from "../core/constants/chains.enum"

const TEST_MNEMONIC = "test test test test test test test test test test test junk"
const EXPECTED_EVM_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

type DerivationReport = {
  mnemonicValid: boolean
  diResolved: boolean
  evmAllMatch: boolean
  bitcoinOk: boolean
  solanaOk: boolean
  cosmosOk: boolean
  xrplOk: boolean
  starknetOk: boolean
  accounts: Account[]
}

@injectable()
class OnboardingViewModel extends ViewModel {
  private readonly _report = new StateFlow<UiState<DerivationReport>>(UiState.idle())
  public readonly report$ = this._report.asReadOnly()

  public constructor(@inject(Tokens.KeyringService) private readonly keyring: KeyringService) {
    super()
  }

  /**
   * Phase 1 PoC: loads the BIP44 test mnemonic, derives every supported
   * chain, and returns a per-chain validity report. Phase 1 Day 7+ swaps
   * this for `WalletRepository.createFromMnemonic` (real user mnemonic +
   * Keychain persistence).
   */
  public runPoc(): void {
    this._report.value = UiState.loading()
    void this.launch(async signal => {
      try {
        const mnemonicValid = Bip39.validate(TEST_MNEMONIC)
        this.keyring.loadMnemonic(TEST_MNEMONIC)
        const accounts = await this.keyring.deriveSupportedAll(0)
        if (signal.aborted) return

        const evmAccounts = accounts.filter(a => a.chain.startsWith("evm:"))
        const report: DerivationReport = {
          mnemonicValid,
          diResolved: true,
          evmAllMatch:
            evmAccounts.length === 5 &&
            evmAccounts.every(a => a.address.toLowerCase() === EXPECTED_EVM_0.toLowerCase()),
          bitcoinOk: accounts.some(a => a.chain === Chain.BITCOIN_TESTNET && a.address.startsWith("tb1q")),
          solanaOk: accounts.some(a => a.chain === Chain.SOLANA_DEVNET && a.address.length >= 32),
          cosmosOk: accounts.some(a => a.chain === Chain.COSMOS_THETA && a.address.startsWith("cosmos1")),
          xrplOk: accounts.some(a => a.chain === Chain.XRPL_TESTNET && a.address.startsWith("r")),
          starknetOk: accounts.some(a => a.chain === Chain.STARKNET_SEPOLIA && a.address.startsWith("0x")),
          accounts
        }
        this._report.value = UiState.success(report)
      } catch (err) {
        if (signal.aborted) return
        this._report.value = UiState.error(err instanceof Error ? err.message : String(err))
      }
    })
  }
}

export default OnboardingViewModel
export type { DerivationReport }
