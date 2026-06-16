import "reflect-metadata"
import { render, fireEvent } from "@testing-library/react-native"
import BalanceCard from "../../src/components/BalanceCard"
import type { PortfolioEntry } from "../../src/models/portfolio.model"
import { Chain } from "../../src/core/constants/chains.enum"

function entry(over: Partial<PortfolioEntry> = {}): PortfolioEntry {
  return {
    account: { chain: Chain.EVM_SEPOLIA, address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" },
    balance: { formatted: "1.2345", raw: 0n, symbol: "ETH" },
    error: null,
    ...over
  } as unknown as PortfolioEntry
}

describe("<BalanceCard />", () => {
  it("renders chain name, symbol and formatted balance", () => {
    const { getByText } = render(<BalanceCard entry={entry()} testID="balance-card.evm-sepolia" />)
    expect(getByText("Sepolia")).toBeTruthy()
    expect(getByText("ETH")).toBeTruthy()
    expect(getByText("1.2345")).toBeTruthy()
  })

  it("shows a spinner while loading instead of the amount", () => {
    const { queryByText } = render(<BalanceCard entry={entry()} loading />)
    expect(queryByText("1.2345")).toBeNull()
  })

  it("shows an error message when balance is unavailable", () => {
    const { getByText } = render(<BalanceCard entry={entry({ balance: null, error: "RPC down" })} />)
    expect(getByText(/RPC down/)).toBeTruthy()
  })

  it("fires onPress + exposes its testID when pressable", () => {
    const onPress = jest.fn()
    const { getByTestId } = render(
      <BalanceCard entry={entry()} onPress={onPress} testID="balance-card.evm-sepolia" />
    )
    fireEvent.press(getByTestId("balance-card.evm-sepolia"))
    expect(onPress).toHaveBeenCalled()
  })
})
