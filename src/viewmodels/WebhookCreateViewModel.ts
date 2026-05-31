import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import { ComputedStateFlow, StateFlow, UiState, ViewModel, type ReadOnlyStateFlow } from "react-native-mobile-mvvm"
import { Tokens } from "../core/di/tokens"
import Webhook, { type WebhookChain } from "../models/webhook.model"
import type WebhookRepository from "../repositories/webhook.repository"

const SUPPORTED_CHAINS: ReadonlyArray<WebhookChain> = [
  "evm:sepolia",
  "evm:polygon-amoy",
  "evm:base-sepolia"
]

type EventCandidate = {
  /** Solidity-style signature, e.g. `Transfer(address,address,uint256)`. */
  signature: string
  name: string
  inputs: ReadonlyArray<{ name: string; type: string; indexed?: boolean }>
}

@Injectable()
class WebhookCreateViewModel extends ViewModel {
  private readonly _chain = new StateFlow<WebhookChain>("evm:sepolia")
  private readonly _contractAddress = new StateFlow<string>("")
  private readonly _abi = new StateFlow<string>("")
  private readonly _eventSignature = new StateFlow<string>("")
  private readonly _state = new StateFlow<UiState<Webhook>>(UiState.idle())

  public readonly chain$ = this._chain.asReadOnly()
  public readonly contractAddress$ = this._contractAddress.asReadOnly()
  public readonly abi$ = this._abi.asReadOnly()
  public readonly eventSignature$ = this._eventSignature.asReadOnly()
  public readonly state$ = this._state.asReadOnly()
  public readonly supportedChains: ReadonlyArray<WebhookChain> = SUPPORTED_CHAINS

  /**
   * Parsed `event` entries from the user-pasted ABI. Empty when no ABI
   * is pasted yet — the UI falls back to a manual signature input.
   */
  public readonly eventCandidates$: ReadOnlyStateFlow<ReadonlyArray<EventCandidate>> =
    ComputedStateFlow.from([this._abi], ([abi]) => parseEventCandidates(abi))

  public constructor(
    @Inject(Tokens.WebhookRepository) private readonly repo: WebhookRepository
  ) {
    super()
  }

  public setChain(chain: WebhookChain): void {
    this._chain.value = chain
  }

  public setContractAddress(value: string): void {
    this._contractAddress.value = value.trim()
  }

  public setAbi(value: string): void {
    this._abi.value = value
  }

  public setEventSignature(value: string): void {
    this._eventSignature.value = value.trim()
  }

  public submit(): void {
    const address = this._contractAddress.value
    const signature = this._eventSignature.value
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      this._state.value = UiState.error("Contract address must be 0x + 40 hex chars")
      return
    }
    if (!/^[A-Za-z_][A-Za-z0-9_]*\(.*\)$/.test(signature)) {
      this._state.value = UiState.error("Event signature must look like Name(types,…)")
      return
    }
    this._state.value = UiState.loading()
    void this.launch(async signal => {
      try {
        const trimmedAbi = this._abi.value.trim()
        const webhook = await this.repo.create({
          chain: this._chain.value,
          contractAddress: address,
          eventSignature: signature,
          abi: trimmedAbi.length > 0 ? trimmedAbi : undefined
        })
        if (signal.aborted) return
        this._state.value = UiState.success(webhook)
      } catch (err) {
        if (signal.aborted) return
        this._state.value = UiState.error(err instanceof Error ? err.message : String(err))
      }
    })
  }

  public reset(): void {
    this._chain.value = "evm:sepolia"
    this._contractAddress.value = ""
    this._abi.value = ""
    this._eventSignature.value = ""
    this._state.value = UiState.idle()
  }
}

function parseEventCandidates(raw: string): ReadonlyArray<EventCandidate> {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return []
  try {
    const parsed = JSON.parse(trimmed) as ReadonlyArray<unknown>
    if (!Array.isArray(parsed)) return []
    const out: EventCandidate[] = []
    for (const item of parsed) {
      if (typeof item !== "object" || item === null) continue
      const obj = item as {
        type?: string
        name?: string
        inputs?: ReadonlyArray<{ name?: string; type?: string; indexed?: boolean }>
      }
      if (obj.type !== "event" || typeof obj.name !== "string") continue
      const inputs = (obj.inputs ?? []).map(i => ({
        name: i.name ?? "",
        type: i.type ?? "unknown",
        indexed: i.indexed
      }))
      const sig = `${obj.name}(${inputs.map(i => i.type).join(",")})`
      out.push({ name: obj.name, signature: sig, inputs })
    }
    return out
  } catch {
    return []
  }
}

export default WebhookCreateViewModel
export type { EventCandidate }
