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

import ContractRepositoryImpl from "../src/repositories/contract.repository.impl"
import { Chain } from "../src/core/constants/chains.enum"

const ABI_JSON = JSON.stringify([
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  }
])

describe("ContractRepositoryImpl", () => {
  beforeEach(() => {
    for (const k of Object.keys(mmkvState)) delete mmkvState[k]
  })

  it("save() parses ABI and returns a Contract", () => {
    const repo = new ContractRepositoryImpl()
    const c = repo.save({
      chain: Chain.EVM_SEPOLIA,
      address: "0xABCDEF",
      name: "MyToken",
      rawAbi: ABI_JSON
    })
    expect(c.functions).toHaveLength(1)
    expect(c.abiKind).toBe("evm")
    expect(c.name).toBe("MyToken")
  })

  it("save() rejects invalid ABI input", () => {
    const repo = new ContractRepositoryImpl()
    expect(() =>
      repo.save({ chain: Chain.EVM_SEPOLIA, address: "0x0", name: "", rawAbi: "not json" })
    ).toThrow()
  })

  it("save() overwrites duplicate id (same chain + address)", () => {
    const repo = new ContractRepositoryImpl()
    repo.save({ chain: Chain.EVM_SEPOLIA, address: "0xABC", name: "v1", rawAbi: ABI_JSON })
    repo.save({ chain: Chain.EVM_SEPOLIA, address: "0xABC", name: "v2", rawAbi: ABI_JSON })
    expect(repo.list()).toHaveLength(1)
    expect(repo.list()[0]!.name).toBe("v2")
  })

  it("delete() removes by id", () => {
    const repo = new ContractRepositoryImpl()
    const c = repo.save({ chain: Chain.EVM_SEPOLIA, address: "0xABC", name: "a", rawAbi: ABI_JSON })
    repo.delete(c.id)
    expect(repo.list()).toHaveLength(0)
  })

  it("persists across instances", () => {
    const a = new ContractRepositoryImpl()
    a.save({ chain: Chain.EVM_SEPOLIA, address: "0xABC", name: "persisted", rawAbi: ABI_JSON })
    const b = new ContractRepositoryImpl()
    expect(b.list()).toHaveLength(1)
    expect(b.list()[0]!.name).toBe("persisted")
  })

  it("defaults the display name to the address when blank", () => {
    const repo = new ContractRepositoryImpl()
    const c = repo.save({
      chain: Chain.EVM_SEPOLIA,
      address: "0xDEAD",
      name: "",
      rawAbi: ABI_JSON
    })
    expect(c.name).toBe("0xDEAD")
  })
})
