import { Chain } from "../core/constants/chains.enum"

type RpcLogStatus = "success" | "error"

class RpcLog {
  public readonly id: string
  public readonly chain: Chain
  public readonly endpoint: string
  public readonly method: string
  public readonly params: unknown
  public readonly response: unknown
  public readonly errorMessage: string | null
  public readonly status: RpcLogStatus
  public readonly latencyMs: number
  public readonly timestamp: Date
  public readonly mocked: boolean

  public constructor(params: {
    id: string
    chain: Chain
    endpoint: string
    method: string
    params: unknown
    response: unknown
    errorMessage?: string | null
    status: RpcLogStatus
    latencyMs: number
    timestamp: Date
    mocked?: boolean
  }) {
    this.id = params.id
    this.chain = params.chain
    this.endpoint = params.endpoint
    this.method = params.method
    this.params = params.params
    this.response = params.response
    this.errorMessage = params.errorMessage ?? null
    this.status = params.status
    this.latencyMs = params.latencyMs
    this.timestamp = params.timestamp
    this.mocked = params.mocked ?? false
  }

  /**
   * Plain JSON-friendly representation. Used for MMKV persistence + the
   * Share-as-JSON export. BigInts and Dates are stringified so the
   * payload survives a `JSON.parse` round-trip.
   */
  public toJSON(): RpcLogJson {
    return {
      id: this.id,
      chain: this.chain,
      endpoint: this.endpoint,
      method: this.method,
      params: sanitize(this.params),
      response: sanitize(this.response),
      errorMessage: this.errorMessage,
      status: this.status,
      latencyMs: this.latencyMs,
      timestampIso: this.timestamp.toISOString(),
      mocked: this.mocked
    }
  }

  public static fromJSON(j: RpcLogJson): RpcLog {
    return new RpcLog({
      id: j.id,
      chain: j.chain as Chain,
      endpoint: j.endpoint,
      method: j.method,
      params: j.params,
      response: j.response,
      errorMessage: j.errorMessage,
      status: j.status,
      latencyMs: j.latencyMs,
      timestamp: new Date(j.timestampIso),
      mocked: j.mocked ?? false
    })
  }
}

type RpcLogJson = {
  id: string
  chain: string
  endpoint: string
  method: string
  params: unknown
  response: unknown
  errorMessage: string | null
  status: RpcLogStatus
  latencyMs: number
  timestampIso: string
  mocked?: boolean
}

// BigInts can't be JSON-stringified, and we don't want huge byte arrays
// blowing up MMKV. Walk the structure and replace anything non-serializable.
function sanitize(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === "bigint") return `${value.toString()}n`
  if (value instanceof Uint8Array) return `<${value.byteLength} bytes>`
  if (Array.isArray(value)) return value.map(sanitize)
  if (typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = sanitize(v)
    return out
  }
  return value
}

export default RpcLog
export type { RpcLogStatus, RpcLogJson }
