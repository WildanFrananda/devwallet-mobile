import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import { StateFlow, UiState, ViewModel } from "react-native-mobile-mvvm"
import { takeUntil } from "rxjs"
import FaucetRepository from "../repositories/faucet.repository"
import WalletRepository from "../repositories/wallet.repository"
import { type FaucetStatus } from "../models/faucet-request.model"
import { FaucetRateLimitError } from "../datasources/faucet/faucet.datasource"
import { Chain } from "../core/constants/chains.enum"
import { Tokens } from "../core/di/tokens"

type ChainRow = {
  status: FaucetStatus | "idle"
  requestId: string | null
  address: string | null
  txHash: string | null
  amount: string | null
  errorMessage: string | null
  manualUrl: string | null
  rateLimitedUntilMs: number | null
}

type RowMap = Readonly<Record<string, ChainRow>>

const EMPTY_ROW: ChainRow = {
  status: "idle",
  requestId: null,
  address: null,
  txHash: null,
  amount: null,
  errorMessage: null,
  manualUrl: null,
  rateLimitedUntilMs: null
}

@Injectable()
class FaucetViewModel extends ViewModel {
  private readonly _rows = new StateFlow<RowMap>({})
  private readonly _addresses = new StateFlow<UiState<Partial<Record<Chain, string>>>>(UiState.idle())

  public readonly rows$ = this._rows.asReadOnly()
  public readonly addresses$ = this._addresses.asReadOnly()

  public constructor(
    @Inject(Tokens.FaucetRepository) private readonly faucet: FaucetRepository,
    @Inject(Tokens.WalletRepository) private readonly wallet: WalletRepository
  ) {
    super()
  }

  /**
   * Called once on screen mount. Derives all chain addresses from the
   * keyring (must already be unlocked) and subscribes to the live event
   * stream so the UI can re-render on every status change.
   */
  public initialize(addressIndex: number = 0): void {
    this._addresses.value = UiState.loading()
    void this.launch(async signal => {
      try {
        const accounts = await this.wallet.deriveAll(addressIndex)
        if (signal.aborted) return
        const map: Partial<Record<Chain, string>> = {}
        for (const account of accounts) {
          map[account.chain] = account.address
        }
        this._addresses.value = UiState.success(map)
      } catch (err) {
        if (signal.aborted) return
        this._addresses.value = UiState.error(err instanceof Error ? err.message : String(err))
      }
    })

    this.faucet.events$().pipe(takeUntil(this.destroy$)).subscribe(event => this.handleEvent(event))
  }

  public requestAll(): void {
    const state = this._addresses.value
    if (state.status !== "success") return
    void this.runEnqueue(state.data)
  }

  public requestSingle(chain: Chain): void {
    const state = this._addresses.value
    if (state.status !== "success") return
    const address = state.data[chain]
    if (!address) return
    void this.runEnqueue({ [chain]: address })
  }

  private async runEnqueue(addresses: Partial<Record<Chain, string>>): Promise<void> {
    // Optimistically mark all targeted chains as pending so UI flips
    // immediately even before HTTP roundtrip.
    const draft: Record<string, ChainRow> = { ...this._rows.value }
    for (const chain of Object.keys(addresses)) {
      draft[chain] = {
        ...(draft[chain] ?? EMPTY_ROW),
        status: "pending",
        address: addresses[chain as Chain] ?? null,
        errorMessage: null,
        manualUrl: null,
        txHash: null,
        amount: null,
        rateLimitedUntilMs: null
      }
    }
    this._rows.value = draft

    try {
      const requests = await this.faucet.enqueue(addresses)
      const next: Record<string, ChainRow> = { ...this._rows.value }
      for (const req of requests) {
        next[req.chain] = {
          ...(next[req.chain] ?? EMPTY_ROW),
          status: req.status,
          requestId: req.id,
          address: req.address
        }
      }
      this._rows.value = next
    } catch (err) {
      if (err instanceof FaucetRateLimitError) {
        const until = Date.now() + err.retryAfterSeconds * 1000
        const next: Record<string, ChainRow> = { ...this._rows.value }
        const existing = next[err.chain] ?? EMPTY_ROW
        next[err.chain] = {
          ...existing,
          status: "failed",
          errorMessage: err.message,
          rateLimitedUntilMs: until
        }
        this._rows.value = next
        return
      }
      // Generic failure — mark all targeted as failed.
      const message = err instanceof Error ? err.message : String(err)
      const next: Record<string, ChainRow> = { ...this._rows.value }
      for (const chain of Object.keys(addresses)) {
        const existing = next[chain] ?? EMPTY_ROW
        next[chain] = { ...existing, status: "failed", errorMessage: message }
      }
      this._rows.value = next
    }
  }

  private handleEvent(event: {
    type: string
    requestId?: string
    chain?: string
    txHash?: string | null
    amount?: string
    error?: string
    manualUrl?: string | null
  }): void {
    if (!event.chain || !event.requestId) return
    const chain = event.chain
    const next: Record<string, ChainRow> = { ...this._rows.value }
    const existing = next[chain] ?? EMPTY_ROW
    if (event.type === "faucet.processing") {
      next[chain] = { ...existing, status: "processing", requestId: event.requestId }
    } else if (event.type === "faucet.success") {
      next[chain] = {
        ...existing,
        status: "completed",
        requestId: event.requestId,
        txHash: event.txHash ?? null,
        amount: event.amount ?? null,
        manualUrl: event.manualUrl ?? null,
        errorMessage: null
      }
    } else if (event.type === "faucet.failed") {
      next[chain] = {
        ...existing,
        status: "failed",
        requestId: event.requestId,
        errorMessage: event.error ?? "Unknown error",
        manualUrl: event.manualUrl ?? null
      }
    } else {
      return
    }
    this._rows.value = next
  }
}

export default FaucetViewModel
export type { ChainRow, RowMap }
