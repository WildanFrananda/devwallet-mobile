import Config from "react-native-config"
import { Observable, Subject, share } from "rxjs"

/**
 * Minimal WebSocket surface used by this client. Avoids the type clash
 * between RN's WebSocket polyfill and undici-types' DOM WebSocket.
 */
type RnWebSocket = {
  readyState: number
  close(): void
  onopen: ((event: unknown) => void) | null
  onmessage: ((event: { data: unknown }) => void) | null
  onerror: ((event: unknown) => void) | null
  onclose: ((event: unknown) => void) | null
}

const WS_OPEN = 1

type FaucetEvent =
  | {
      type: "subscribed"
      fingerprint: string
      ts: number
    }
  | {
      type: "faucet.processing"
      requestId: string
      chain: string
      address: string
    }
  | {
      type: "faucet.success"
      requestId: string
      chain: string
      address: string
      txHash: string | null
      amount: string
      manualUrl?: string | null
    }
  | {
      type: "faucet.failed"
      requestId: string
      chain: string
      address: string
      error: string
      manualUrl?: string | null
    }

/**
 * Single multiplexed WebSocket to the backend faucet gateway. Reconnects
 * with exponential backoff (1s → 2s → 4s → 8s → 30s cap) on close. Emits
 * every server event through a shared `events$` Observable so multiple
 * subscribers fan out without opening duplicate sockets.
 */
class FaucetWsClient {
  private socket: RnWebSocket | null = null
  private fingerprint: string | null = null
  private readonly subject = new Subject<FaucetEvent>()
  private readonly events$: Observable<FaucetEvent> = this.subject.asObservable().pipe(share())
  private reconnectAttempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private disposed = false

  public connect(fingerprint: string): Observable<FaucetEvent> {
    this.fingerprint = fingerprint
    if (this.socket && this.socket.readyState === WS_OPEN) {
      return this.events$
    }
    this.openSocket()
    return this.events$
  }

  public dispose(): void {
    this.disposed = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
    this.subject.complete()
  }

  private openSocket(): void {
    if (!this.fingerprint) return
    const base = Config.FAUCET_WS_URL || "ws://localhost:3000/faucet/ws"
    const url = `${base}?fingerprint=${encodeURIComponent(this.fingerprint)}`
    const ws = new WebSocket(url) as unknown as RnWebSocket
    this.socket = ws

    ws.onopen = (): void => {
      this.reconnectAttempt = 0
    }
    ws.onmessage = (event): void => {
      try {
        const parsed = JSON.parse(typeof event.data === "string" ? event.data : "") as FaucetEvent
        this.subject.next(parsed)
      } catch {
        // ignore non-JSON
      }
    }
    ws.onerror = (): void => {
      // close handler triggers reconnect
    }
    ws.onclose = (): void => {
      this.socket = null
      if (this.disposed) return
      const delay = FaucetWsClient.backoffMs(this.reconnectAttempt)
      this.reconnectAttempt += 1
      this.reconnectTimer = setTimeout(() => this.openSocket(), delay)
    }
  }

  private static backoffMs(attempt: number): number {
    return Math.min(1000 * 2 ** attempt, 30_000)
  }
}

export default FaucetWsClient
export type { FaucetEvent }
