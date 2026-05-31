import "reflect-metadata"

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

import ReplayRepositoryImpl from "../src/repositories/replay.repository.impl"
import Replay from "../src/models/replay.model"
import { Chain } from "../src/core/constants/chains.enum"

function makeReplay(id: string): Replay {
  return new Replay({
    id,
    originHash: `0x${id}`,
    originChain: "ethereum",
    replayChain: Chain.EVM_SEPOLIA,
    decoded: {
      hash: `0x${id}`,
      from: "0xfrom",
      to: "0xto",
      value: 100n,
      input: "0xa9059cbb",
      functionName: "transfer",
      args: [{ name: "to", type: "address", value: "0xdead" }],
      matchedAbi: "common"
    },
    status: "broadcast",
    replayHash: `0xreplay-${id}`,
    createdAt: new Date(2026, 0, 1)
  })
}

describe("ReplayRepositoryImpl", () => {
  beforeEach(() => {
    for (const k of Object.keys(mmkvState)) delete mmkvState[k]
  })

  it("save() persists + newest first", () => {
    const repo = new ReplayRepositoryImpl()
    repo.save(makeReplay("a"))
    repo.save(makeReplay("b"))
    const list = repo.list()
    expect(list).toHaveLength(2)
    expect(list[0]!.id).toBe("b")
  })

  it("update() patches existing entry", () => {
    const repo = new ReplayRepositoryImpl()
    repo.save(makeReplay("a"))
    repo.update("a", { status: "confirmed", replayHash: "0xfinal" })
    const updated = repo.get("a")
    expect(updated?.status).toBe("confirmed")
    expect(updated?.replayHash).toBe("0xfinal")
  })

  it("delete() removes by id", () => {
    const repo = new ReplayRepositoryImpl()
    repo.save(makeReplay("a"))
    repo.delete("a")
    expect(repo.list()).toHaveLength(0)
  })

  it("persists across instances + bigint round-trip", () => {
    const a = new ReplayRepositoryImpl()
    a.save(makeReplay("a"))
    const b = new ReplayRepositoryImpl()
    const restored = b.list()
    expect(restored).toHaveLength(1)
    expect(restored[0]!.decoded.value).toBe(100n)
  })

  it("caps at 50 entries", () => {
    const repo = new ReplayRepositoryImpl()
    for (let i = 0; i < 55; i++) repo.save(makeReplay(`m${i}`))
    expect(repo.list()).toHaveLength(50)
    expect(repo.list()[0]!.id).toBe("m54")
  })
})
