import "reflect-metadata"
import { render } from "@testing-library/react-native"
import DecodedTxDisplay from "../../src/components/DecodedTxDisplay"
import type { DecodedTx } from "../../src/models/replay.model"

function decoded(over: Partial<DecodedTx> = {}): DecodedTx {
  return {
    hash: "0xhash",
    from: "0x1111111111111111111111111111111111111111",
    to: "0x2222222222222222222222222222222222222222",
    value: 1000n,
    input: "0xa9059cbb",
    functionName: "transfer",
    args: [{ name: "to", type: "address", value: "0xdead" }],
    matchedAbi: "common",
    ...over
  } as DecodedTx
}

describe("<DecodedTxDisplay />", () => {
  it("renders from→to (shortened), value, and the decoded function + args", () => {
    const { getByText } = render(<DecodedTxDisplay decoded={decoded()} />)
    expect(getByText(/0x1111…1111/)).toBeTruthy()
    expect(getByText("1000 wei")).toBeTruthy()
    expect(getByText("transfer")).toBeTruthy()
    expect(getByText(/matched via common ABI/)).toBeTruthy()
    expect(getByText("to: address")).toBeTruthy()
  })

  it("shows '<contract creation>' when there is no recipient", () => {
    const { getByText } = render(<DecodedTxDisplay decoded={decoded({ to: null })} />)
    expect(getByText(/<contract creation>/)).toBeTruthy()
  })

  it("falls back to raw input when the function selector is unknown", () => {
    const { getByText } = render(
      <DecodedTxDisplay decoded={decoded({ functionName: null, args: [] })} />
    )
    expect(getByText(/Selector not in common ABI/)).toBeTruthy()
    expect(getByText("0xa9059cbb")).toBeTruthy()
  })

  it("shows 'no args' for a recognised function with empty args", () => {
    const { getByText } = render(<DecodedTxDisplay decoded={decoded({ args: [] })} />)
    expect(getByText("no args")).toBeTruthy()
  })
})
