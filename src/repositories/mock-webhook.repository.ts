import { Injectable } from "react-native-mobile-mvvm/di"
import { Observable, Subject } from "rxjs"
import WebhookRepository from "./webhook.repository"
import Webhook, { type WebhookChain } from "../models/webhook.model"
import WebhookLog from "../models/webhook-log.model"
import type { WebhookEvent } from "../datasources/webhook/webhook.datasource"

const EMIT_DELAY_MS = 800

/**
 * E2E-only Webhook repository. Registered in place of WebhookRepositoryImpl
 * when `Config.E2E_MOCK === "1"` (see DIContainer). Models the backend's
 * log store + WS push faithfully so the Detail screen's LIVE-EVENT refresh path
 * is genuinely exercised (not just the initial bind):
 *
 *   1. A newly created webhook has NO logs yet — `logs()` returns `[]`.
 *   2. The first `logs()` call (Detail mount via bind) schedules a single
 *      `webhook.event` ~1.2s later, simulating the watched contract emitting.
 *   3. That event reaches WebhookDetailViewModel's subscription (subscribed in
 *      its constructor, before bind calls logs) → it calls `refreshLogs()`.
 *   4. By then the event has "fired", so `logs()` returns the one canned log.
 *
 * The Detail log row can therefore appear ONLY if the event-driven refresh ran —
 * a broken subscription would leave the screen on its empty state. Never hits
 * the network or WebSocket.
 */
@Injectable()
class MockWebhookRepository extends WebhookRepository {
  private readonly subject = new Subject<WebhookEvent>()
  private readonly store: Webhook[] = []
  private readonly firedById = new Set<string>()
  private readonly scheduledById = new Set<string>()
  private seq = 0

  public override create(input: {
    chain: WebhookChain
    contractAddress: string
    eventSignature: string
    abi?: string
  }): Promise<Webhook> {
    this.seq += 1
    const id = `wh-e2e-${this.seq}`
    const now = new Date()
    const webhook = new Webhook({
      id,
      chain: input.chain,
      contractAddress: input.contractAddress,
      eventSignature: input.eventSignature,
      isActive: true,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      createdAt: now
    })
    this.store.unshift(webhook)
    return Promise.resolve(webhook)
  }

  public override list(): Promise<Webhook[]> {
    return Promise.resolve([...this.store])
  }

  public override delete(id: string): Promise<void> {
    const idx = this.store.findIndex(w => w.id === id)
    if (idx >= 0) this.store.splice(idx, 1)
    this.firedById.delete(id)
    this.scheduledById.delete(id)
    return Promise.resolve()
  }

  public override logs(id: string): Promise<WebhookLog[]> {
    if (this.firedById.has(id)) {
      return Promise.resolve([
        new WebhookLog({
          id: `lg-${id}-1`,
          webhookId: id,
          blockNumber: "12345678",
          txHash: "0xmocktxhashdeadbeef",
          logIndex: 0,
          decodedArgs: { from: "0x1111111111111111111111111111111111111111" },
          firedAt: new Date()
        })
      ])
    }
    // First read for this webhook (Detail just mounted): schedule the contract
    // event, but report no logs yet so the empty state is shown until it fires.
    if (!this.scheduledById.has(id)) {
      this.scheduledById.add(id)
      setTimeout(() => {
        this.firedById.add(id)
        this.subject.next({
          type: "webhook.event",
          webhookId: id,
          blockNumber: "12345678",
          txHash: "0xmocktxhashdeadbeef",
          decoded: { from: "0x1111111111111111111111111111111111111111" }
        })
      }, EMIT_DELAY_MS)
    }
    return Promise.resolve([])
  }

  public override events$(): Observable<WebhookEvent> {
    return this.subject.asObservable()
  }
}

export default MockWebhookRepository
