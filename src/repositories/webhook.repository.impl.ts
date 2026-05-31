import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import { Observable } from "rxjs"
import { Tokens } from "../core/di/tokens"
import Webhook, { type WebhookChain } from "../models/webhook.model"
import WebhookLog from "../models/webhook-log.model"
import type WebhookDatasource from "../datasources/webhook/webhook.datasource"
import type { WebhookEvent } from "../datasources/webhook/webhook.datasource"
import type DeviceFingerprintService from "../core/auth/device-fingerprint.service"
import WebhookRepository from "./webhook.repository"

@Injectable()
class WebhookRepositoryImpl extends WebhookRepository {
  public constructor(
    @Inject(Tokens.WebhookDatasource) private readonly datasource: WebhookDatasource,
    @Inject(Tokens.DeviceFingerprint) private readonly fingerprint: DeviceFingerprintService
  ) {
    super()
  }

  public async create(input: {
    chain: WebhookChain
    contractAddress: string
    eventSignature: string
    abi?: string
  }): Promise<Webhook> {
    const fp = await this.fingerprint.get()
    const response = await this.datasource.create({ ...input, deviceFingerprint: fp })
    return new Webhook({
      id: response.id,
      chain: response.chain as WebhookChain,
      contractAddress: response.contractAddress,
      eventSignature: response.eventSignature,
      isActive: response.isActive,
      expiresAt: new Date(response.expiresAt),
      createdAt: new Date(response.createdAt)
    })
  }

  public async list(): Promise<Webhook[]> {
    const fp = await this.fingerprint.get()
    const rows = await this.datasource.list(fp)
    return rows.map(
      r =>
        new Webhook({
          id: r.id,
          chain: r.chain as WebhookChain,
          contractAddress: r.contractAddress,
          eventSignature: r.eventSignature,
          isActive: r.isActive,
          expiresAt: new Date(r.expiresAt),
          createdAt: new Date(r.createdAt)
        })
    )
  }

  public delete(id: string): Promise<void> {
    return this.datasource.remove(id)
  }

  public async logs(id: string, limit?: number): Promise<WebhookLog[]> {
    const rows = await this.datasource.logs(id, limit)
    return rows.map(
      r =>
        new WebhookLog({
          id: r.id,
          webhookId: r.webhookId,
          blockNumber: r.blockNumber,
          txHash: r.txHash,
          logIndex: r.logIndex,
          decodedArgs: r.decodedArgs,
          firedAt: new Date(r.firedAt)
        })
    )
  }

  public events$(): Observable<WebhookEvent> {
    // Lazy subscription: defer fingerprint resolution until somebody
    // subscribes so the WS doesn't open during DI bootstrap.
    return new Observable<WebhookEvent>(subscriber => {
      let cleanup: (() => void) | null = null
      void this.fingerprint.get().then(fp => {
        const sub = this.datasource.subscribe(fp).subscribe({
          next: ev => subscriber.next(ev),
          error: err => subscriber.error(err),
          complete: () => subscriber.complete()
        })
        cleanup = () => sub.unsubscribe()
      })
      return () => {
        if (cleanup) cleanup()
      }
    })
  }
}

export default WebhookRepositoryImpl
