import Config from "react-native-config"
import { Chain } from "../../core/constants/chains.enum"

type EnqueueResponse = {
  jobs: ReadonlyArray<{ chain: string; requestId: string; jobId: string }>
}

type StatusResponse = {
  id: string
  chain: string
  address: string
  status: "pending" | "processing" | "completed" | "failed"
  tx_hash: string | null
  amount: string | null
  error_msg: string | null
  manual_url: string | null
  completed_at: string | null
}

type RateLimited = {
  statusCode: 429
  message: string
  chain: string
  retryAfterSeconds: number
}

class FaucetRateLimitError extends Error {
  public readonly chain: string
  public readonly retryAfterSeconds: number

  public constructor(chain: string, retryAfterSeconds: number, message: string) {
    super(message)
    this.name = "FaucetRateLimitError"
    this.chain = chain
    this.retryAfterSeconds = retryAfterSeconds
  }
}

/**
 * HTTP client for the backend Faucet API. Pure data transport; the
 * repository layer wraps these into domain models.
 */
class FaucetDatasource {
  private readonly base: string

  public constructor(base?: string) {
    this.base = base ?? Config.API_BASE_URL
  }

  public async enqueue(
    addresses: Partial<Record<Chain, string>>,
    deviceFingerprint: string
  ): Promise<EnqueueResponse> {
    const res = await fetch(`${this.base}/faucet/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addresses, deviceFingerprint })
    })
    const body = (await res.json().catch(() => ({}))) as EnqueueResponse | RateLimited
    if (res.status === 429) {
      const limited = body as RateLimited
      throw new FaucetRateLimitError(limited.chain, limited.retryAfterSeconds, limited.message)
    }
    if (!res.ok) {
      throw new Error(`Faucet request failed ${res.status}: ${JSON.stringify(body).slice(0, 200)}`)
    }
    return body as EnqueueResponse
  }

  public async status(requestId: string): Promise<StatusResponse> {
    const res = await fetch(`${this.base}/faucet/status/${requestId}`)
    const body = (await res.json().catch(() => ({}))) as StatusResponse | { message?: string }
    if (!res.ok) {
      const message = (body as { message?: string }).message ?? `HTTP ${res.status}`
      throw new Error(`Faucet status failed: ${message}`)
    }
    return body as StatusResponse
  }
}

export default FaucetDatasource
export { FaucetRateLimitError, type StatusResponse, type EnqueueResponse }
