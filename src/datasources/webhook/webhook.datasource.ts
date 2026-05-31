import Config from "react-native-config"
import { Observable, Subject, share } from "rxjs"
import type { WebhookChain } from "../../models/webhook.model"

type WebhookResponse = {
  id: string
  chain: string
  contractAddress: string
  eventSignature: string
  isActive: boolean
  expiresAt: string
  createdAt: string
}

type WebhookLogResponse = {
  id: string
  webhookId: string | null
  blockNumber: string | null
  txHash: string | null
  logIndex: number | null
  decodedArgs: Record<string, unknown> | null
  firedAt: string
}

type WebhookEvent =
  | { type: "webhook.hello"; ts: number }
  | {
      type: "webhook.event"
      webhookId: string
      blockNumber: string
      txHash: string | undefined
      decoded: Record<string, unknown>
    }

type RnWebSocket = {
  readyState: number
  close(): void
  onopen: ((event: unknown) => void) | null
  onmessage: ((event: { data: unknown }) => void) | null
  onerror: ((event: unknown) => void) | null
  onclose: ((event: unknown) => void) | null
}

const WS_OPEN = 1

class WebhookDatasource {
  private readonly base: string
  private socket: RnWebSocket | null = null
  private deviceId: string | null = null
  private readonly subject = new Subject<WebhookEvent>()
  private readonly events$: Observable<WebhookEvent> = this.subject.asObservable().pipe(share())
  private reconnectAttempt = 0

  public constructor(base?: string) {
    this.base = base ?? Config.API_BASE_URL
  }

  public async create(input: {
    chain: WebhookChain
    contractAddress: string
    eventSignature: string
    deviceFingerprint: string
    abi?: string
  }): Promise<WebhookResponse> {
    const res = await fetch(`${this.base}/api/v1/webhooks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    })
    if (!res.ok) throw new Error(`POST /webhooks ${res.status}: ${await res.text()}`)
    return (await res.json()) as WebhookResponse
  }

  public async list(deviceFingerprint: string): Promise<WebhookResponse[]> {
    const res = await fetch(
      `${this.base}/api/v1/webhooks?device=${encodeURIComponent(deviceFingerprint)}`
    )
    if (!res.ok) throw new Error(`GET /webhooks ${res.status}`)
    return (await res.json()) as WebhookResponse[]
  }

  public async remove(id: string): Promise<void> {
    const res = await fetch(`${this.base}/api/v1/webhooks/${id}`, { method: "DELETE" })
    if (!res.ok && res.status !== 204) {
      throw new Error(`DELETE /webhooks/${id} ${res.status}`)
    }
  }

  public async logs(id: string, limit: number = 50): Promise<WebhookLogResponse[]> {
    const res = await fetch(`${this.base}/api/v1/webhooks/${id}/logs?limit=${limit}`)
    if (!res.ok) throw new Error(`GET /webhooks/${id}/logs ${res.status}`)
    return (await res.json()) as WebhookLogResponse[]
  }

  /**
   * Subscribe to live webhook events for a device. Reconnects with
   * exponential backoff on close. Re-uses the same shared observable
   * across all subscribers.
   */
  public subscribe(deviceId: string): Observable<WebhookEvent> {
    if (this.deviceId !== deviceId) {
      this.deviceId = deviceId
      this.disconnect()
      this.connect()
    } else if (this.socket === null) {
      this.connect()
    }
    return this.events$
  }

  public disconnect(): void {
    if (this.socket) {
      try {
        this.socket.close()
      } catch {
        // ignore
      }
      this.socket = null
    }
  }

  private connect(): void {
    if (!this.deviceId) return
    const url = `${this.base.replace(/^http/, "ws")}/webhooks/ws?deviceId=${encodeURIComponent(this.deviceId)}`
    const socket = new WebSocket(url) as unknown as RnWebSocket
    this.socket = socket
    socket.onopen = () => {
      this.reconnectAttempt = 0
    }
    socket.onmessage = (event: { data: unknown }) => {
      if (typeof event.data !== "string") return
      try {
        const parsed = JSON.parse(event.data) as WebhookEvent
        this.subject.next(parsed)
      } catch {
        // ignore malformed
      }
    }
    socket.onerror = () => {
      // Reconnect handled by onclose.
    }
    socket.onclose = () => {
      this.socket = null
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (!this.deviceId) return
    this.reconnectAttempt += 1
    const delay = Math.min(30_000, 1_000 * 2 ** (this.reconnectAttempt - 1))
    setTimeout(() => {
      if (this.deviceId !== null && this.socket === null && this.subject.observed) {
        this.connect()
      }
    }, delay)
  }
}

function isSocketOpen(socket: RnWebSocket | null): boolean {
  return socket !== null && socket.readyState === WS_OPEN
}

export default WebhookDatasource
export type { WebhookResponse, WebhookLogResponse, WebhookEvent }
export { isSocketOpen }
