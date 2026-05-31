import { custom, type EIP1193RequestFn, type Transport } from "viem"
import { Chain } from "../constants/chains.enum"
import RpcLog from "../../models/rpc-log.model"
import RpcLogSink from "./rpc-log.sink"
import RpcMockStore from "./rpc-mock.store"

/**
 * Wraps a viem `Transport` (typically `http(rpcUrl)`) with an interceptor
 * that records every request/response pair into the RPC log repository
 * via `RpcLogSink`. The wrapper is fully transparent — the returned
 * transport satisfies the same `Transport` shape, so call sites stay
 * identical.
 *
 * Usage:
 *   const transport = loggingTransport(http(cfg.rpcUrl), chain, cfg.rpcUrl)
 *   const client = createPublicClient({ transport })
 */
function loggingTransport(base: Transport, chain: Chain, endpoint: string): Transport {
  // retryCount: 0 — the wrapped `base` (e.g. `http()`) already retries
  // failures internally; adding another retry layer here would duplicate
  // log entries for every failed call.
  return custom(
    {
      async request({ method, params }: { method: string; params?: unknown }) {
        const start = Date.now()
        // Mock short-circuit — registered mocks bypass the network entirely.
        const mock = RpcMockStore.get(method)
        if (mock !== null) {
          RpcLogSink.record(
            new RpcLog({
              id: generateId(),
              chain,
              endpoint,
              method,
              params,
              response: mock.response,
              status: "success",
              latencyMs: Date.now() - start,
              timestamp: new Date(),
              mocked: true
            })
          )
          return mock.response
        }
        // Instantiate the wrapped transport per call so viem's internal
        // chain/timeout context is forwarded correctly. Cheap — viem just
        // captures a closure here.
        const inner = base({}) as { request: EIP1193RequestFn }
        try {
          const response = await inner.request({ method, params })
          RpcLogSink.record(
            new RpcLog({
              id: generateId(),
              chain,
              endpoint,
              method,
              params,
              response,
              status: "success",
              latencyMs: Date.now() - start,
              timestamp: new Date()
            })
          )
          return response
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err)
          RpcLogSink.record(
            new RpcLog({
              id: generateId(),
              chain,
              endpoint,
              method,
              params,
              response: null,
              errorMessage,
              status: "error",
              latencyMs: Date.now() - start,
              timestamp: new Date()
            })
          )
          throw err
        }
      }
    },
    { retryCount: 0 }
  )
}

/**
 * Generic fetch-style logger. Returns the response body (already parsed
 * as JSON when possible) and writes an RpcLog entry. Use this in
 * non-viem fetchers (Bitcoin Blockstream, Cosmos REST, etc.) so they
 * still surface in the RPC Inspector.
 */
async function fetchAndLog<T>(args: {
  chain: Chain
  endpoint: string
  method: string
  params: unknown
  fetcher: () => Promise<Response>
}): Promise<T> {
  const start = Date.now()
  const mock = RpcMockStore.get(args.method)
  if (mock !== null) {
    RpcLogSink.record(
      new RpcLog({
        id: generateId(),
        chain: args.chain,
        endpoint: args.endpoint,
        method: args.method,
        params: args.params,
        response: mock.response,
        status: "success",
        latencyMs: Date.now() - start,
        timestamp: new Date(),
        mocked: true
      })
    )
    return mock.response as T
  }
  try {
    const res = await args.fetcher()
    if (!res.ok) {
      const body = await res.text()
      RpcLogSink.record(
        new RpcLog({
          id: generateId(),
          chain: args.chain,
          endpoint: args.endpoint,
          method: args.method,
          params: args.params,
          response: null,
          errorMessage: `HTTP ${res.status}: ${body}`,
          status: "error",
          latencyMs: Date.now() - start,
          timestamp: new Date()
        })
      )
      throw new Error(`HTTP ${res.status}: ${body}`)
    }
    const json = (await res.json()) as T
    RpcLogSink.record(
      new RpcLog({
        id: generateId(),
        chain: args.chain,
        endpoint: args.endpoint,
        method: args.method,
        params: args.params,
        response: json,
        status: "success",
        latencyMs: Date.now() - start,
        timestamp: new Date()
      })
    )
    return json
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("HTTP ")) throw err
    const errorMessage = err instanceof Error ? err.message : String(err)
    RpcLogSink.record(
      new RpcLog({
        id: generateId(),
        chain: args.chain,
        endpoint: args.endpoint,
        method: args.method,
        params: args.params,
        response: null,
        errorMessage,
        status: "error",
        latencyMs: Date.now() - start,
        timestamp: new Date()
      })
    )
    throw err
  }
}

/**
 * Generic call wrapper for libraries we can't intercept at the transport
 * layer (Solana web3.js, Cosmos Stargate, XRPL ws, Starknet RpcProvider).
 * Wrap any async chain method like:
 *
 *   await callAndLog({
 *     chain: Chain.SOLANA_DEVNET,
 *     endpoint: cfg.rpcUrl,
 *     method: "getBalance",
 *     params: { address },
 *     run: () => connection.getBalance(pubkey)
 *   })
 *
 * Mock store works too — if a method is mocked, the call is short-circuited.
 */
async function callAndLog<T>(args: {
  chain: Chain
  endpoint: string
  method: string
  params: unknown
  run: () => Promise<T>
}): Promise<T> {
  const start = Date.now()
  const mock = RpcMockStore.get(args.method)
  if (mock !== null) {
    RpcLogSink.record(
      new RpcLog({
        id: generateId(),
        chain: args.chain,
        endpoint: args.endpoint,
        method: args.method,
        params: args.params,
        response: mock.response,
        status: "success",
        latencyMs: Date.now() - start,
        timestamp: new Date(),
        mocked: true
      })
    )
    return mock.response as T
  }
  try {
    const result = await args.run()
    RpcLogSink.record(
      new RpcLog({
        id: generateId(),
        chain: args.chain,
        endpoint: args.endpoint,
        method: args.method,
        params: args.params,
        response: result,
        status: "success",
        latencyMs: Date.now() - start,
        timestamp: new Date()
      })
    )
    return result
  } catch (err) {
    RpcLogSink.record(
      new RpcLog({
        id: generateId(),
        chain: args.chain,
        endpoint: args.endpoint,
        method: args.method,
        params: args.params,
        response: null,
        errorMessage: err instanceof Error ? err.message : String(err),
        status: "error",
        latencyMs: Date.now() - start,
        timestamp: new Date()
      })
    )
    throw err
  }
}

let counter = 0
function generateId(): string {
  counter = (counter + 1) % Number.MAX_SAFE_INTEGER
  return `${Date.now().toString(36)}-${counter.toString(36)}`
}

export { loggingTransport, fetchAndLog, callAndLog }
