import "reflect-metadata"
import RpcLogSink from "../src/core/network/rpc-log.sink"
import { loggingTransport, fetchAndLog } from "../src/core/network/logging-transport"
import RpcLog from "../src/models/rpc-log.model"
import { Chain } from "../src/core/constants/chains.enum"
import type RpcLogRepository from "../src/repositories/rpc-log.repository"

class RecorderRepo implements RpcLogRepository {
  public logs: RpcLog[] = []
  public append(l: RpcLog): void {
    this.logs.push(l)
  }
  public list(): RpcLog[] {
    return this.logs
  }
  public stream$(): import("rxjs").Observable<RpcLog[]> {
    throw new Error("unused")
  }
  public clear(): void {
    this.logs = []
  }
  public exportJson(): string {
    return ""
  }
}

let recorder: RecorderRepo

beforeEach(() => {
  recorder = new RecorderRepo()
  RpcLogSink.register(recorder)
})

afterEach(() => {
  RpcLogSink.reset()
})

describe("loggingTransport", () => {
  function makeBaseTransport(response: unknown, fail = false) {
    // viem's `Transport` is a callable; the fake matches the minimal shape
    // the wrapper uses.
    return () => ({
      request: jest.fn(() => (fail ? Promise.reject(new Error("rpc boom")) : Promise.resolve(response)))
    })
  }

  it("records a success log when the inner transport resolves", async () => {
    const base = makeBaseTransport({ ok: true }) as never
    const wrapped = loggingTransport(base, Chain.EVM_SEPOLIA, "https://rpc.x")
    const transport = wrapped({})
    const out = await transport.request({ method: "eth_chainId", params: [] })
    expect(out).toEqual({ ok: true })
    expect(recorder.logs).toHaveLength(1)
    const first = recorder.logs[0]!
    expect(first.method).toBe("eth_chainId")
    expect(first.status).toBe("success")
    expect(first.chain).toBe(Chain.EVM_SEPOLIA)
  })

  it("records an error log when the inner transport throws", async () => {
    const base = makeBaseTransport(null, true) as never
    const wrapped = loggingTransport(base, Chain.EVM_SEPOLIA, "https://rpc.x")
    const transport = wrapped({})
    await expect(transport.request({ method: "eth_chainId", params: [] })).rejects.toThrow("rpc boom")
    expect(recorder.logs).toHaveLength(1)
    const first = recorder.logs[0]!
    expect(first.status).toBe("error")
    expect(first.errorMessage).toBe("rpc boom")
  })
})

describe("fetchAndLog", () => {
  it("returns parsed JSON and records a success log on 2xx", async () => {
    const fakeFetch = jest.fn(() => Promise.resolve(new Response(JSON.stringify({ balance: 42 }), { status: 200 })))
    const out = await fetchAndLog<{ balance: number }>({
      chain: Chain.BITCOIN_TESTNET,
      endpoint: "https://blockstream",
      method: "GET /address",
      params: { address: "tb1q..." },
      fetcher: fakeFetch
    })
    expect(out.balance).toBe(42)
    expect(recorder.logs).toHaveLength(1)
    expect(recorder.logs[0]!.status).toBe("success")
  })

  it("records an error log and throws on non-2xx", async () => {
    const fakeFetch = jest.fn(() => Promise.resolve(new Response("not found", { status: 404 })))
    await expect(
      fetchAndLog({
        chain: Chain.BITCOIN_TESTNET,
        endpoint: "https://blockstream",
        method: "GET /address",
        params: { address: "tb1q..." },
        fetcher: fakeFetch
      })
    ).rejects.toThrow(/HTTP 404/)
    expect(recorder.logs).toHaveLength(1)
    expect(recorder.logs[0]!.status).toBe("error")
    expect(recorder.logs[0]!.errorMessage).toMatch(/404/)
  })

  it("records an error log when the fetcher itself rejects", async () => {
    const fakeFetch = jest.fn(() => Promise.reject(new Error("network down")))
    await expect(
      fetchAndLog({
        chain: Chain.BITCOIN_TESTNET,
        endpoint: "https://blockstream",
        method: "GET /address",
        params: { address: "tb1q..." },
        fetcher: fakeFetch
      })
    ).rejects.toThrow("network down")
    expect(recorder.logs).toHaveLength(1)
    expect(recorder.logs[0]!.errorMessage).toBe("network down")
  })

  it("is a no-op when no sink is registered", async () => {
    RpcLogSink.reset()
    const fakeFetch = jest.fn(() => Promise.resolve(new Response("{}", { status: 200 })))
    await fetchAndLog({
      chain: Chain.BITCOIN_TESTNET,
      endpoint: "https://blockstream",
      method: "GET /address",
      params: {},
      fetcher: fakeFetch
    })
    expect(recorder.logs).toHaveLength(0)
  })
})
