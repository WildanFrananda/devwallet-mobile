import { Injectable } from "react-native-mobile-mvvm/di"
import { createPublicClient, http, type EIP1193RequestFn } from "viem"
import { loggingTransport } from "../../core/network/logging-transport"
import type RpcLog from "../../models/rpc-log.model"

type ReplayOutcome =
  | { kind: "success"; response: unknown; latencyMs: number }
  | { kind: "error"; message: string; latencyMs: number }

/**
 * Re-executes the request captured in an `RpcLog`. Two call styles
 * supported, matching the two interceptor paths in the codebase:
 *
 *   - JSON-RPC (viem `request`): EVM chains. Heuristic: method does
 *     NOT start with `GET ` / `POST ` and isn't a Solana web3.js label.
 *   - REST (fetch): Bitcoin Blockstream + future REST clients. Method
 *     prefix is `GET /...` or `POST /...`.
 *
 * The replay re-uses `loggingTransport` so a new RpcLog entry lands in
 * the sink — UI gets a fresh row clearly tagged as a replay.
 */
@Injectable()
class RpcReplayDatasource {
  public async replay(log: RpcLog): Promise<ReplayOutcome> {
    const start = Date.now()
    try {
      const response = await this.dispatch(log)
      return { kind: "success", response, latencyMs: Date.now() - start }
    } catch (err) {
      return {
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - start
      }
    }
  }

  private async dispatch(log: RpcLog): Promise<unknown> {
    if (this.isRest(log.method)) return this.replayRest(log)
    return this.replayJsonRpc(log)
  }

  private isRest(method: string): boolean {
    return /^(GET|POST|PUT|DELETE) /i.test(method)
  }

  private async replayJsonRpc(log: RpcLog): Promise<unknown> {
    const params = Array.isArray(log.params) ? (log.params as unknown[]) : []
    const transport = loggingTransport(http(log.endpoint), log.chain, log.endpoint)
    // viem's `Transport` is a callable that returns the live request fn.
    const client = createPublicClient({ transport })
    const request = client.request as EIP1193RequestFn
    return request({ method: log.method, params })
  }

  private async replayRest(log: RpcLog): Promise<unknown> {
    const [verb, path] = log.method.split(/\s+/, 2)
    const url = path && path.startsWith("/") ? `${log.endpoint}${path}` : log.endpoint
    const res = await fetch(url, { method: verb })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    const contentType = res.headers.get("content-type") ?? ""
    if (contentType.includes("application/json")) return res.json()
    return res.text()
  }
}

export default RpcReplayDatasource
export type { ReplayOutcome }
