import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import { EventFlow, StateFlow, UiState, ViewModel } from "react-native-mobile-mvvm"
import WalletRepository from "../repositories/wallet.repository"
import Bip39 from "../core/crypto/bip39"
import { Tokens } from "../core/di/tokens"
import Account from "../models/account.model"

type VerifyChallenge = {
  indices: ReadonlyArray<number>
  expected: ReadonlyArray<string>
}

@Injectable()
class OnboardingViewModel extends ViewModel {
  private readonly _mnemonic = new StateFlow<UiState<string[]>>(UiState.idle())
  private readonly _verify = new StateFlow<VerifyChallenge | null>(null)
  private readonly _persist = new StateFlow<UiState<Account>>(UiState.idle())
  private readonly _navigate = new EventFlow<"verify" | "done">()

  public readonly mnemonic$ = this._mnemonic.asReadOnly()
  public readonly verify$ = this._verify.asReadOnly()
  public readonly persist$ = this._persist.asReadOnly()
  public readonly navigate$ = this._navigate.asObservable()

  public constructor(@Inject(Tokens.WalletRepository) private readonly wallet: WalletRepository) {
    super()
  }

  public generate(strength: 128 | 256 = 128): void {
    this._mnemonic.value = UiState.loading()
    try {
      const phrase = Bip39.generate(strength)
      const words = phrase.split(" ")
      this._mnemonic.value = UiState.success(words)
    } catch (err) {
      this._mnemonic.value = UiState.error(err instanceof Error ? err.message : String(err))
    }
  }

  /**
   * Build a random 3-of-12 verification challenge from the current mnemonic
   * draft. UI prompts user to enter the words at the picked positions.
   */
  public prepareVerify(): void {
    const state = this._mnemonic.value
    if (state.status !== "success") {
      this._persist.value = UiState.error("Generate a mnemonic first")
      return
    }
    const words = state.data
    const indices = OnboardingViewModel.pickIndices(words.length, 3)
    this._verify.value = {
      indices,
      expected: indices.map(i => words[i] ?? "")
    }
    this._navigate.emit("verify")
  }

  public submitVerify(answers: ReadonlyArray<string>, requireBiometric: boolean = true): void {
    const challenge = this._verify.value
    const draft = this._mnemonic.value
    if (!challenge || draft.status !== "success") {
      this._persist.value = UiState.error("No challenge active")
      return
    }
    const ok = challenge.expected.every((w, i) => (answers[i] ?? "").trim().toLowerCase() === w.toLowerCase())
    if (!ok) {
      this._persist.value = UiState.error("Words don't match. Try again.")
      return
    }

    this._persist.value = UiState.loading()
    void this.launch(async signal => {
      try {
        const phrase = draft.data.join(" ")
        const account = await this.wallet.createFromMnemonic(phrase, requireBiometric)
        if (signal.aborted) return
        this._persist.value = UiState.success(account)
        this._navigate.emit("done")
      } catch (err) {
        if (signal.aborted) return
        this._persist.value = UiState.error(err instanceof Error ? err.message : String(err))
      }
    })
  }

  /**
   * Restore path: user typed an existing mnemonic. Validate BIP39 checksum,
   * then persist + load keyring. No verify step needed.
   */
  public submitRestore(rawInput: string, requireBiometric: boolean = true): void {
    const phrase = rawInput.trim().toLowerCase().replace(/\s+/g, " ")
    const wordCount = phrase.split(" ").length
    if (wordCount !== 12 && wordCount !== 24) {
      this._persist.value = UiState.error(`Expected 12 or 24 words, got ${wordCount}`)
      return
    }

    this._persist.value = UiState.loading()
    void this.launch(async signal => {
      try {
        const account = await this.wallet.restore(phrase, requireBiometric)
        if (signal.aborted) return
        this._persist.value = UiState.success(account)
        this._navigate.emit("done")
      } catch (err) {
        if (signal.aborted) return
        this._persist.value = UiState.error(err instanceof Error ? err.message : String(err))
      }
    })
  }

  public reset(): void {
    this._mnemonic.value = UiState.idle()
    this._verify.value = null
    this._persist.value = UiState.idle()
  }

  private static pickIndices(total: number, count: number): number[] {
    const picked = new Set<number>()
    while (picked.size < count) {
      picked.add(Math.floor(Math.random() * total))
    }
    return [...picked].sort((a, b) => a - b)
  }
}

export default OnboardingViewModel
export type { VerifyChallenge }
