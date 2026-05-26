import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import {
  ComputedStateFlow,
  StateFlow,
  UiState,
  ViewModel,
  type ReadOnlyStateFlow
} from "react-native-mobile-mvvm"
import { parseEther } from "viem"
import WalletRepository from "../repositories/wallet.repository"
import { Tokens } from "../core/di/tokens"
import SendDraft from "../models/send-draft.model"
import Transaction from "../models/transaction.model"
import { Chain } from "../core/constants/chains.enum"

type SendOutcome = {
  hash: string
  receipt: Transaction | null
}

@Injectable()
class SendViewModel extends ViewModel {
  private readonly _chain = new StateFlow<Chain | null>(null)
  private readonly _fromAddress = new StateFlow<string>("")
  private readonly _recipient = new StateFlow<string>("")
  private readonly _amount = new StateFlow<string>("")
  private readonly _state = new StateFlow<UiState<SendOutcome>>(UiState.idle())

  public readonly recipient$ = this._recipient.asReadOnly()
  public readonly amount$ = this._amount.asReadOnly()
  public readonly state$ = this._state.asReadOnly()

  public readonly canSubmit$: ReadOnlyStateFlow<boolean> = ComputedStateFlow.from(
    [this._chain, this._fromAddress, this._recipient, this._amount, this._state],
    ([chain, from, to, amount, state]) => {
      if (chain === null || from.length === 0) return false
      if (to.trim().length === 0 || amount.trim().length === 0) return false
      return state.status !== "loading"
    }
  )

  public constructor(@Inject(Tokens.WalletRepository) private readonly wallet: WalletRepository) {
    super()
  }

  /** Called once from the screen `useInit` with route params. */
  public bind(chain: Chain, fromAddress: string): void {
    this._chain.value = chain
    this._fromAddress.value = fromAddress
  }

  public setRecipient(value: string): void {
    this._recipient.value = value
  }

  public setAmount(value: string): void {
    this._amount.value = value
  }

  public submit(): void {
    const chain = this._chain.value
    const fromAddress = this._fromAddress.value
    if (!chain || !fromAddress) {
      this._state.value = UiState.error("Send not bound — call bind() first")
      return
    }

    let raw: bigint
    try {
      raw = parseEther(this._amount.value.trim())
    } catch {
      this._state.value = UiState.error("Invalid amount")
      return
    }

    const draft = new SendDraft({
      chain,
      fromAddress,
      toAddress: this._recipient.value.trim(),
      amount: raw
    })

    this._state.value = UiState.loading()
    void this.launch(async signal => {
      try {
        const { hash } = await this.wallet.sendTx(draft)
        if (signal.aborted) return
        this._state.value = UiState.success({ hash, receipt: null })
        const receipt = await this.wallet.waitForConfirmation(chain, hash)
        if (signal.aborted) return
        this._state.value = UiState.success({ hash, receipt })
      } catch (err) {
        if (signal.aborted) return
        this._state.value = UiState.error(err instanceof Error ? err.message : String(err))
      }
    })
  }

  public reset(): void {
    this._recipient.value = ""
    this._amount.value = ""
    this._state.value = UiState.idle()
  }
}

export default SendViewModel
export type { SendOutcome }
