import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import { StateFlow, UiState, ViewModel } from "react-native-mobile-mvvm"
import { takeUntil } from "rxjs"
import { Tokens } from "../core/di/tokens"
import Webhook from "../models/webhook.model"
import type WebhookRepository from "../repositories/webhook.repository"

@Injectable()
class WebhookListViewModel extends ViewModel {
  private readonly _state = new StateFlow<UiState<ReadonlyArray<Webhook>>>(UiState.idle())
  /** Live event flag — flips momentarily when an event arrives so the
   * UI can show a "new event" pulse without changing the list itself. */
  private readonly _lastEventAt = new StateFlow<number>(0)

  public readonly state$ = this._state.asReadOnly()
  public readonly lastEventAt$ = this._lastEventAt.asReadOnly()

  public constructor(
    @Inject(Tokens.WebhookRepository) private readonly repo: WebhookRepository
  ) {
    super()
    this.repo
      .events$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this._lastEventAt.value = Date.now()
      })
  }

  public refresh(): void {
    if (this._state.value.status !== "success") {
      this._state.value = UiState.loading()
    }
    void this.launch(async signal => {
      try {
        const list = await this.repo.list()
        if (signal.aborted) return
        this._state.value = UiState.success(list)
      } catch (err) {
        if (signal.aborted) return
        if (this._state.value.status !== "success") {
          this._state.value = UiState.error(err instanceof Error ? err.message : String(err))
        }
      }
    })
  }

  public delete(id: string): void {
    void this.launch(async () => {
      await this.repo.delete(id)
      this.refresh()
    })
  }
}

export default WebhookListViewModel
