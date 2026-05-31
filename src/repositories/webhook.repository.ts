import { Observable } from "rxjs"
import Webhook, { type WebhookChain } from "../models/webhook.model"
import WebhookLog from "../models/webhook-log.model"
import type { WebhookEvent } from "../datasources/webhook/webhook.datasource"

abstract class WebhookRepository {
  public abstract create(input: {
    chain: WebhookChain
    contractAddress: string
    eventSignature: string
    abi?: string
  }): Promise<Webhook>
  public abstract list(): Promise<Webhook[]>
  public abstract delete(id: string): Promise<void>
  public abstract logs(id: string, limit?: number): Promise<WebhookLog[]>
  public abstract events$(): Observable<WebhookEvent>
}

export default WebhookRepository
