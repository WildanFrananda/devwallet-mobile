import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import { StateFlow, UiState, ViewModel } from "react-native-mobile-mvvm"
import { takeUntil } from "rxjs"
import { Chain } from "../core/constants/chains.enum"
import { REPLAY_ORIGINS, sourceFor } from "../core/constants/replay-sources"
import { Tokens } from "../core/di/tokens"
import Replay, { type DecodedTx, type ReplayOriginChain } from "../models/replay.model"
import type ReplayRepository from "../repositories/replay.repository"
import type ReplayDecoderDatasource from "../datasources/replay/replay-decoder.datasource"
import type ReplayExecutorDatasource from "../datasources/replay/replay-executor.datasource"
import type WalletRepository from "../repositories/wallet.repository"

@Injectable()
class TxReplayViewModel extends ViewModel {
  private readonly _origin = new StateFlow<ReplayOriginChain>("ethereum")
  private readonly _inputHash = new StateFlow<string>("")
  private readonly _extraAbi = new StateFlow<string>("")
  private readonly _decoded = new StateFlow<UiState<DecodedTx>>(UiState.idle())
  private readonly _replayChain = new StateFlow<Chain>(Chain.EVM_SEPOLIA)
  private readonly _valueOverride = new StateFlow<string>("0")
  private readonly _replayState = new StateFlow<UiState<Replay>>(UiState.idle())
  private readonly _history = new StateFlow<ReadonlyArray<Replay>>([])

  public readonly origin$ = this._origin.asReadOnly()
  public readonly inputHash$ = this._inputHash.asReadOnly()
  public readonly extraAbi$ = this._extraAbi.asReadOnly()
  public readonly decoded$ = this._decoded.asReadOnly()
  public readonly replayChain$ = this._replayChain.asReadOnly()
  public readonly valueOverride$ = this._valueOverride.asReadOnly()
  public readonly replayState$ = this._replayState.asReadOnly()
  public readonly history$ = this._history.asReadOnly()
  public readonly origins: ReadonlyArray<ReplayOriginChain> = REPLAY_ORIGINS

  public constructor(
    @Inject(Tokens.ReplayDecoderDatasource) private readonly decoder: ReplayDecoderDatasource,
    @Inject(Tokens.ReplayExecutorDatasource) private readonly executor: ReplayExecutorDatasource,
    @Inject(Tokens.ReplayRepository) private readonly repo: ReplayRepository,
    @Inject(Tokens.WalletRepository) private readonly wallet: WalletRepository
  ) {
    super()
    this._history.value = this.repo.list()
    this.repo
      .stream$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => {
        this._history.value = list
      })
  }

  public setOrigin(origin: ReplayOriginChain): void {
    this._origin.value = origin
    // Snap to the paired testnet so the user doesn't have to switch
    // origin + target separately.
    this._replayChain.value = sourceFor(origin).testnetPair
  }

  public setInputHash(value: string): void {
    this._inputHash.value = value
  }

  public setExtraAbi(value: string): void {
    this._extraAbi.value = value
  }

  public setReplayChain(chain: Chain): void {
    this._replayChain.value = chain
  }

  public setValueOverride(value: string): void {
    this._valueOverride.value = value
  }

  public fetchAndDecode(): void {
    const hash = this._inputHash.value.trim()
    if (hash.length === 0) {
      this._decoded.value = UiState.error("Paste a tx hash first")
      return
    }
    this._decoded.value = UiState.loading()
    void this.launch(async signal => {
      try {
        const extraAbi = this.parseAbi(this._extraAbi.value)
        const decoded = await this.decoder.fetchAndDecode(this._origin.value, hash, extraAbi)
        if (signal.aborted) return
        this._decoded.value = UiState.success(decoded)
      } catch (err) {
        if (signal.aborted) return
        this._decoded.value = UiState.error(err instanceof Error ? err.message : String(err))
      }
    })
  }

  public executeReplay(): void {
    const state = this._decoded.value
    if (state.status !== "success") {
      this._replayState.value = UiState.error("Decode the tx first")
      return
    }
    const decoded = state.data
    this._replayState.value = UiState.loading()
    void this.launch(async signal => {
      try {
        const account = await this.wallet.derive(this._replayChain.value)
        if (signal.aborted) return
        let valueOverride = 0n
        try {
          valueOverride = BigInt(this._valueOverride.value.trim() || "0")
        } catch {
          throw new Error("Invalid value override (expect decimal wei)")
        }
        const result = await this.executor.execute({
          decoded,
          replayChain: this._replayChain.value,
          privateKey: account.privateKey,
          valueOverride
        })
        if (signal.aborted) return
        const replay = new Replay({
          id: `${decoded.hash}-${Date.now()}`,
          originHash: decoded.hash,
          originChain: this._origin.value,
          replayChain: this._replayChain.value,
          decoded,
          replayHash: result.hash,
          status: "broadcast",
          createdAt: new Date()
        })
        this.repo.save(replay)
        this._replayState.value = UiState.success(replay)
      } catch (err) {
        if (signal.aborted) return
        this._replayState.value = UiState.error(err instanceof Error ? err.message : String(err))
      }
    })
  }

  public deleteReplay(id: string): void {
    this.repo.delete(id)
  }

  /**
   * Reload a saved replay back into the form so the user can rerun it.
   * Leaves the executor outcome idle until the user taps Replay again.
   */
  public reloadFromHistory(id: string): void {
    const replay = this.repo.get(id)
    if (!replay) return
    this._origin.value = replay.originChain
    this._inputHash.value = replay.originHash
    this._replayChain.value = replay.replayChain
    this._decoded.value = UiState.success(replay.decoded)
    this._replayState.value = UiState.idle()
  }

  private parseAbi(raw: string): import("viem").Abi | null {
    const trimmed = raw.trim()
    if (trimmed.length === 0) return null
    try {
      return JSON.parse(trimmed) as import("viem").Abi
    } catch {
      throw new Error("Extra ABI must be valid JSON (paste from Etherscan or empty)")
    }
  }
}

export default TxReplayViewModel
