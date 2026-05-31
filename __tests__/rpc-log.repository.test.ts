import "reflect-metadata"
import { firstValueFrom, take, toArray } from "rxjs"
import RpcLog from "../src/models/rpc-log.model"
import { Chain } from "../src/core/constants/chains.enum"

const mmkvState: Record<string, unknown> = {}
jest.mock("react-native-mmkv", () => ({
  createMMKV: () => ({
    getBoolean: (k: string) => mmkvState[k] as boolean | undefined,
    getNumber: (k: string) => mmkvState[k] as number | undefined,
    getString: (k: string) => mmkvState[k] as string | undefined,
    set: (k: string, v: unknown) => {
      mmkvState[k] = v
    },
    remove: (k: string) => {
      delete mmkvState[k]
    }
  })
}))

import RpcLogRepositoryImpl from "../src/repositories/rpc-log.repository.impl"

function makeLog(method: string, ms: number = 0): RpcLog {
  return new RpcLog({
    id: `id-${method}-${ms}`,
    chain: Chain.EVM_SEPOLIA,
    endpoint: "https://rpc.example",
    method,
    params: [{ x: 1, big: 10n }],
    response: { result: "ok" },
    status: "success",
    latencyMs: ms,
    timestamp: new Date(1_700_000_000_000 + ms)
  })
}

describe("RpcLogRepositoryImpl", () => {
  beforeEach(() => {
    for (const k of Object.keys(mmkvState)) delete mmkvState[k]
  })

  it("returns empty list when no logs persisted", () => {
    const repo = new RpcLogRepositoryImpl()
    expect(repo.list()).toEqual([])
  })

  it("appends newest-first and caps at 500 entries", () => {
    const repo = new RpcLogRepositoryImpl()
    for (let i = 0; i < 510; i++) repo.append(makeLog(`m${i}`, i))
    const list = repo.list()
    expect(list).toHaveLength(500)
    expect(list[0]!.method).toBe("m509")
    expect(list[499]!.method).toBe("m10")
  })

  it("persists across instances", () => {
    const a = new RpcLogRepositoryImpl()
    a.append(makeLog("eth_chainId"))
    a.append(makeLog("eth_blockNumber"))
    const b = new RpcLogRepositoryImpl()
    expect(b.list().map(l => l.method)).toEqual(["eth_blockNumber", "eth_chainId"])
  })

  it("clear() empties the buffer and persists", () => {
    const a = new RpcLogRepositoryImpl()
    a.append(makeLog("eth_chainId"))
    a.clear()
    expect(a.list()).toEqual([])
    const b = new RpcLogRepositoryImpl()
    expect(b.list()).toEqual([])
  })

  it("exportJson() produces parseable payload with sanitized bigints", () => {
    const repo = new RpcLogRepositoryImpl()
    repo.append(makeLog("eth_call"))
    const out = repo.exportJson()
    const parsed = JSON.parse(out) as { count: number; entries: Array<{ method: string; params: unknown }> }
    expect(parsed.count).toBe(1)
    expect(parsed.entries[0]!.method).toBe("eth_call")
    // BigInt sanitized to "10n" string.
    expect(JSON.stringify(parsed.entries[0]!.params)).toContain("\"10n\"")
  })

  it("stream$ emits on every append", async () => {
    const repo = new RpcLogRepositoryImpl()
    const promise = firstValueFrom(repo.stream$().pipe(take(3), toArray()))
    repo.append(makeLog("a"))
    repo.append(makeLog("b"))
    const emitted = await promise
    expect(emitted).toHaveLength(3)
    expect(emitted[2]![0]!.method).toBe("b")
  })
})
