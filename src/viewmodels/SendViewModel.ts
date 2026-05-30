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
import FeeDatasource from "../datasources/fee/fee.datasource"
import GasRepository from "../repositories/gas.repository"
import type { GasTier } from "../datasources/gas/gas-oracle.datasource"
import { Tokens } from "../core/di/tokens"
import SendDraft, { type GasOverride } from "../models/send-draft.model"
import Transaction from "../models/transaction.model"
import { Chain } from "../core/constants/chains.enum"
import { AddressValidator } from "../core/crypto/validators"

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
  private readonly _maxLoading = new StateFlow<boolean>(false)
  public readonly maxLoading$ = this._maxLoading.asReadOnly()

  public readonly recipient$ = this._recipient.asReadOnly()
  public readonly amount$ = this._amount.asReadOnly()
  public readonly state$ = this._state.asReadOnly()

  public readonly recipientError$: ReadOnlyStateFlow<string | null> = ComputedStateFlow.from(
    [this._chain, this._recipient],
    ([chain, to]) => {
      if (chain === null) return null
      if (to.trim().length === 0) return null
      const result = AddressValidator.validate(chain, to)
      return result.valid ? null : result.error ?? "Invalid address"
    }
  )

  public readonly canSubmit$: ReadOnlyStateFlow<boolean> = ComputedStateFlow.from(
    [this._chain, this._fromAddress, this._recipient, this._amount, this._state, this.recipientError$],
    ([chain, from, to, amount, state, recipientError]) => {
      if (chain === null || from.length === 0) return false
      if (to.trim().length === 0 || amount.trim().length === 0) return false
      if (recipientError !== null) return false
      return state.status !== "loading"
    }
  )

  private readonly _gasTiers = new StateFlow<ReadonlyArray<GasTier>>([])
  private readonly _selectedTier = new StateFlow<GasTier["label"] | null>(null)
  public readonly gasTiers$ = this._gasTiers.asReadOnly()
  public readonly selectedTier$ = this._selectedTier.asReadOnly()

  public constructor(
    @Inject(Tokens.WalletRepository) private readonly wallet: WalletRepository,
    @Inject(Tokens.FeeDatasource) private readonly fees: FeeDatasource,
    @Inject(Tokens.GasRepository) private readonly gas: GasRepository
  ) {
    super()
  }

  public setSelectedTier(label: GasTier["label"]): void {
    this._selectedTier.value = label
  }

  public loadGasTiers(): void {
    const chain = this._chain.value
    if (chain === null) return
    if (
      chain !== Chain.EVM_SEPOLIA &&
      chain !== Chain.EVM_POLYGON_AMOY &&
      chain !== Chain.EVM_BASE_SEPOLIA
    ) {
      this._gasTiers.value = []
      return
    }
    void this.launch(async signal => {
      try {
        const snap = await this.gas.fetchOracle(chain)
        if (signal.aborted || this._chain.value !== chain) return
        this._gasTiers.value = snap.tiers
        if (this._selectedTier.value === null) this._selectedTier.value = "standard"
      } catch {
        // Non-fatal — Send screen will just fall back to viem's per-call estimate.
      }
    })
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
      amount: raw,
      gasOverride: this.resolveGasOverride()
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

  public setMaxAmount(): void {
    const chain = this._chain.value
    const fromAddress = this._fromAddress.value
    if (!chain || !fromAddress) return
    this._maxLoading.value = true
    void this.launch(async signal => {
      try {
        const portfolio = await this.wallet.loadPortfolio(0)
        if (signal.aborted) return
        const entry = portfolio.entries.find(
          e => e.account.chain === chain && e.account.address.toLowerCase() === fromAddress.toLowerCase()
        )
        const balance = entry?.balance
        if (!balance) {
          this._state.value = UiState.error("Could not read current balance for Max")
          return
        }
        const liveFee = await this.fees.estimateNativeFee(chain).catch(() => 0n)
        const buffer = liveFee > 0n ? liveFee : SendViewModel.feeBufferFor(chain)
        const max = balance.raw > buffer ? balance.raw - buffer : 0n
        this._amount.value = SendViewModel.formatUnits(max, balance.decimals)
      } catch (err) {
        if (signal.aborted) return
        this._state.value = UiState.error(err instanceof Error ? err.message : String(err))
      } finally {
        if (!signal.aborted) this._maxLoading.value = false
      }
    })
  }

  public reset(): void {
    this._recipient.value = ""
    this._amount.value = ""
    this._state.value = UiState.idle()
  }

  private resolveGasOverride(): GasOverride | null {
    const label = this._selectedTier.value
    if (label === null) return null
    const tier = this._gasTiers.value.find(t => t.label === label)
    if (!tier) return null
    return {
      maxFeePerGas: tier.maxFeePerGas,
      maxPriorityFeePerGas: tier.maxPriorityFeePerGas
    }
  }

  /**
   * Fallback fee buffer used only when the live estimator fails. Per-chain
   * conservative values; real fee usually less. User can edit Max downward.
   */
  private static feeBufferFor(chain: Chain): bigint {
    switch (chain) {
      case Chain.EVM_SEPOLIA:
      case Chain.EVM_POLYGON_AMOY:
      case Chain.EVM_BASE_SEPOLIA:
        return 21000n * 2_000_000_000n
      case Chain.BITCOIN_TESTNET:
        return 2000n
      case Chain.SOLANA_DEVNET:
        return 5000n
      case Chain.COSMOS_THETA:
        return 5000n
      case Chain.XRPL_TESTNET:
        return 10n
      case Chain.STARKNET_SEPOLIA:
        return 0n
    }
  }

  private static formatUnits(raw: bigint, decimals: number): string {
    if (raw === 0n) return "0"
    const base = 10n ** BigInt(decimals)
    const whole = raw / base
    const frac = raw % base
    const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "")
    return fracStr.length > 0 ? `${whole}.${fracStr}` : whole.toString()
  }
}

export default SendViewModel
export type { SendOutcome }
