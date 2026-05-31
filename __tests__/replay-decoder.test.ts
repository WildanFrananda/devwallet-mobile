import "reflect-metadata"
import { toFunctionSelector, type Abi } from "viem"
import ReplayDecoderDatasource from "../src/datasources/replay/replay-decoder.datasource"

// ERC-20 transfer(0xdeadbeef..., 1000) ≈ 0xa9059cbb selector + 2 args
// Address: 0x000000000000000000000000deadbeefdeadbeefdeadbeefdeadbeefdeadbeef
// Amount:  0x00000000000000000000000000000000000000000000000000000000000003e8 (1000)
const TRANSFER_INPUT =
  "0xa9059cbb" +
  "000000000000000000000000deadbeefdeadbeefdeadbeefdeadbeefdeadbeef" +
  "00000000000000000000000000000000000000000000000000000000000003e8"

describe("ReplayDecoderDatasource.decodeInput", () => {
  const decoder = new ReplayDecoderDatasource()

  it("returns null for empty input", () => {
    expect(decoder.decodeInput("0x", null)).toBeNull()
  })

  it("decodes ERC-20 transfer from common ABI", () => {
    const out = decoder.decodeInput(TRANSFER_INPUT as `0x${string}`, null)
    expect(out).not.toBeNull()
    if (!out) return
    expect(out.name).toBe("transfer")
    expect(out.matchedAbi).toBe("common")
    expect(out.args).toHaveLength(2)
    expect(out.args[0]!.type).toBe("address")
    expect(out.args[0]!.value.toLowerCase()).toContain("deadbeef")
    expect(out.args[1]!.type).toBe("uint256")
    expect(out.args[1]!.value).toBe("1000")
  })

  it("returns null when no signature matches", () => {
    const fake = "0xffffffff00112233"
    expect(decoder.decodeInput(fake as `0x${string}`, null)).toBeNull()
  })

  it("uses user-supplied ABI when common ABI does not match", () => {
    const customAbi: Abi = [
      {
        type: "function",
        name: "doThing",
        inputs: [{ name: "x", type: "uint256" }],
        outputs: [],
        stateMutability: "nonpayable"
      }
    ]
    const selector = toFunctionSelector("doThing(uint256)")
    const input =
      `${selector}0000000000000000000000000000000000000000000000000000000000000005`
    const out = decoder.decodeInput(input as `0x${string}`, customAbi)
    expect(out).not.toBeNull()
    if (!out) return
    expect(out.name).toBe("doThing")
    expect(out.matchedAbi).toBe("user")
    expect(out.args[0]!.value).toBe("5")
  })
})
