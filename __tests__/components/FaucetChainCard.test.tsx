import "reflect-metadata"
import { render, fireEvent } from "@testing-library/react-native"
import FaucetChainCard from "../../src/components/FaucetChainCard"
import type { ChainRow } from "../../src/viewmodels/FaucetViewModel"
import type { NetworkConfig } from "../../src/core/constants/networks"
import { Chain } from "../../src/core/constants/chains.enum"

const CFG: NetworkConfig = {
  chain: Chain.EVM_SEPOLIA,
  name: "Sepolia",
  symbol: "ETH",
  decimals: 18,
  rpcUrl: "https://rpc.test/sepolia",
  explorerUrl: "https://sepolia.etherscan.io",
  faucetUrl: null
}

function row(over: Partial<ChainRow> = {}): ChainRow {
  return {
    status: "idle",
    requestId: null,
    address: "0xabc",
    txHash: null,
    amount: null,
    errorMessage: null,
    manualUrl: null,
    rateLimitedUntilMs: null,
    ...over
  }
}

const ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

describe("<FaucetChainCard />", () => {
  it("renders chain name, symbol and a truncated address", () => {
    const { getByText, getByTestId } = render(
      <FaucetChainCard cfg={CFG} address={ADDRESS} row={undefined} now={0} slug="sepolia" onRequest={jest.fn()} />
    )
    expect(getByText(/Sepolia/)).toBeTruthy()
    expect(getByText(/ETH/)).toBeTruthy()
    expect(getByTestId("faucet.row.sepolia")).toBeTruthy()
  })

  it("shows the amount with a completed status badge on success", () => {
    const { getByTestId, getByText } = render(
      <FaucetChainCard
        cfg={CFG}
        address={ADDRESS}
        row={row({ status: "completed", amount: "0.05", txHash: "0xtx" })}
        now={0}
        slug="sepolia"
        onRequest={jest.fn()}
      />
    )
    expect(getByTestId("faucet.row.sepolia.status-completed")).toBeTruthy()
    expect(getByText(/\+0\.05 ETH/)).toBeTruthy()
  })

  it("surfaces the error message on failure", () => {
    const { getByText } = render(
      <FaucetChainCard
        cfg={CFG}
        address={ADDRESS}
        row={row({ status: "failed", errorMessage: "rate limited" })}
        now={0}
        slug="sepolia"
        onRequest={jest.fn()}
      />
    )
    expect(getByText("rate limited")).toBeTruthy()
  })

  it("fires onRequest when the request button is tapped", () => {
    const onRequest = jest.fn()
    const { getByTestId } = render(
      <FaucetChainCard cfg={CFG} address={ADDRESS} row={row()} now={0} slug="sepolia" onRequest={onRequest} />
    )
    fireEvent.press(getByTestId("faucet.row.sepolia.request"))
    expect(onRequest).toHaveBeenCalled()
  })

  it("disables the request button + shows a countdown while rate-limited", () => {
    const onRequest = jest.fn()
    const future = 100000
    const { getByTestId, getByText } = render(
      <FaucetChainCard
        cfg={CFG}
        address={ADDRESS}
        row={row({ status: "failed", rateLimitedUntilMs: future })}
        now={0}
        slug="sepolia"
        onRequest={onRequest}
      />
    )
    expect(getByText(/retry in/i)).toBeTruthy()
    const btn = getByTestId("faucet.row.sepolia.request")
    expect(btn).toBeDisabled()
    fireEvent.press(btn)
    expect(onRequest).not.toHaveBeenCalled()
  })

  it("hides the request button when no address is derived yet", () => {
    const { queryByTestId } = render(
      <FaucetChainCard cfg={CFG} address={undefined} row={undefined} now={0} slug="sepolia" onRequest={jest.fn()} />
    )
    expect(queryByTestId("faucet.row.sepolia.request")).toBeNull()
  })
})
