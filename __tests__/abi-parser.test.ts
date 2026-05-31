import { parseAbi } from "../src/core/abi/abi-parser"

const EVM_ERC20 = JSON.stringify([
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable"
  },
  { type: "event", name: "Transfer", inputs: [] }
])

const CAIRO_FAUCET = JSON.stringify([
  {
    type: "interface",
    name: "devwallet::IFaucet",
    items: [
      {
        type: "function",
        name: "drip",
        inputs: [{ name: "recipient", type: "core::starknet::contract_address::ContractAddress" }],
        outputs: [],
        state_mutability: "external"
      },
      {
        type: "function",
        name: "drip_amount",
        inputs: [],
        outputs: [{ type: "core::integer::u256" }],
        state_mutability: "view"
      }
    ]
  },
  {
    type: "impl",
    name: "FaucetImpl"
  }
])

describe("parseAbi", () => {
  it("rejects empty input", () => {
    expect(() => parseAbi("")).toThrow(/empty/i)
  })

  it("rejects non-JSON input", () => {
    expect(() => parseAbi("not json")).toThrow(/not valid JSON/i)
  })

  it("rejects non-array JSON", () => {
    expect(() => parseAbi("{}")).toThrow(/array/i)
  })

  it("parses EVM ABI and skips non-function entries", () => {
    const out = parseAbi(EVM_ERC20)
    expect(out.kind).toBe("evm")
    expect(out.functions).toHaveLength(2)
    const fns = out.functions
    expect(fns[0]!.name).toBe("balanceOf")
    expect(fns[0]!.stateMutability).toBe("view")
    expect(fns[1]!.name).toBe("transfer")
    expect(fns[1]!.inputs).toHaveLength(2)
  })

  it("parses Cairo ABI from interface items", () => {
    const out = parseAbi(CAIRO_FAUCET)
    expect(out.kind).toBe("starknet")
    expect(out.functions).toHaveLength(2)
    expect(out.functions[0]!.name).toBe("drip")
    expect(out.functions[0]!.stateMutability).toBe("external")
    expect(out.functions[1]!.name).toBe("drip_amount")
    expect(out.functions[1]!.stateMutability).toBe("view")
  })

  it("parses Anchor IDL — instructions become write functions", () => {
    const idl = JSON.stringify({
      version: "0.1.0",
      name: "dev_faucet",
      instructions: [
        {
          name: "initialize",
          accounts: [],
          args: [
            { name: "drip_amount", type: "u64" },
            { name: "cooldown", type: "u64" }
          ]
        },
        {
          name: "drip",
          accounts: [],
          args: [{ name: "amount", type: { defined: "U256" } }]
        }
      ]
    })
    const out = parseAbi(idl)
    expect(out.kind).toBe("solana")
    expect(out.functions).toHaveLength(2)
    expect(out.functions[0]!.name).toBe("initialize")
    expect(out.functions[0]!.stateMutability).toBe("nonpayable")
    expect(out.functions[0]!.inputs).toHaveLength(2)
    expect(out.functions[1]!.inputs[0]!.type).toContain("defined")
  })

  it("rejects an object root without `instructions`", () => {
    expect(() => parseAbi("{\"name\":\"not-anchor\"}")).toThrow(/EVM|Cairo|Anchor/)
  })

  it("normalises unknown state mutability strings to nonpayable", () => {
    const weird = JSON.stringify([
      {
        type: "function",
        name: "weird",
        inputs: [],
        outputs: [],
        stateMutability: "nonsense"
      }
    ])
    expect(parseAbi(weird).functions[0]!.stateMutability).toBe("nonpayable")
  })
})
