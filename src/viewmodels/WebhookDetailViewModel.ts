import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import { StateFlow, UiState, ViewModel } from "react-native-mobile-mvvm"
import { takeUntil } from "rxjs"
import { Tokens } from "../core/di/tokens"
import Webhook from "../models/webhook.model"
import WebhookLog from "../models/webhook-log.model"
import type WebhookRepository from "../repositories/webhook.repository"

@Injectable()
class WebhookDetailViewModel extends ViewModel {
  private readonly _webhook = new StateFlow<Webhook | null>(null)
  private readonly _logs = new StateFlow<UiState<ReadonlyArray<WebhookLog>>>(UiState.idle())

  public readonly webhook$ = this._webhook.asReadOnly()
  public readonly logs$ = this._logs.asReadOnly()

  public constructor(
    @Inject(Tokens.WebhookRepository) private readonly repo: WebhookRepository
  ) {
    super()
    // Refresh logs whenever a live event arrives for THIS webhook.
    this.repo
      .events$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        const current = this._webhook.value
        if (!current || event.type !== "webhook.event") return
        if (event.webhookId !== current.id) return
        this.refreshLogs()
      })
  }

  public bind(webhook: Webhook): void {
    this._webhook.value = webhook
    this.refreshLogs()
  }

  public refreshLogs(): void {
    const current = this._webhook.value
    if (!current) return
    if (this._logs.value.status !== "success") {
      this._logs.value = UiState.loading()
    }
    void this.launch(async signal => {
      try {
        const list = await this.repo.logs(current.id, 50)
        if (signal.aborted) return
        this._logs.value = UiState.success(list)
      } catch (err) {
        if (signal.aborted) return
        if (this._logs.value.status !== "success") {
          this._logs.value = UiState.error(err instanceof Error ? err.message : String(err))
        }
      }
    })
  }

  public delete(onDone: () => void): void {
    const current = this._webhook.value
    if (!current) return
    void this.launch(async () => {
      try {
        await this.repo.delete(current.id)
        onDone()
      } catch {
        // Surface via list refresh fallback; detail screen exits regardless.
        onDone()
      }
    })
  }
}

export default WebhookDetailViewModel
