import "reflect-metadata"
import { render } from "@testing-library/react-native"
import TokenList from "../../src/components/TokenList"
import type Token from "../../src/models/token.model"

function tok(symbol: string, formatted: string, contractAddress: string): Token {
  return { symbol, formatted, contractAddress } as unknown as Token
}

describe("<TokenList />", () => {
  it("renders nothing when token list is undefined or empty", () => {
    const { toJSON, rerender } = render(<TokenList tokens={undefined} />)
    expect(toJSON()).toBeNull()
    rerender(<TokenList tokens={[]} />)
    expect(toJSON()).toBeNull()
  })

  it("renders a row per token with symbol + formatted amount", () => {
    const { getByText } = render(
      <TokenList tokens={[tok("USDC", "12.50", "0xaaa"), tok("LINK", "3.00", "0xbbb")]} />
    )
    expect(getByText("USDC")).toBeTruthy()
    expect(getByText("12.50")).toBeTruthy()
    expect(getByText("LINK")).toBeTruthy()
    expect(getByText("3.00")).toBeTruthy()
  })
})
