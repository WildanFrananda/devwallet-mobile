import "reflect-metadata"
import { render, fireEvent } from "@testing-library/react-native"
import NetworkSelector from "../../src/components/NetworkSelector"
import { Chain } from "../../src/core/constants/chains.enum"

describe("<NetworkSelector />", () => {
  it("lists 'All networks' plus every registered chain", () => {
    const { getByText } = render(
      <NetworkSelector visible selected="all" onSelect={() => undefined} onClose={() => undefined} />
    )
    expect(getByText("All networks")).toBeTruthy()
    expect(getByText("Sepolia")).toBeTruthy()
    expect(getByText("Solana devnet")).toBeTruthy()
  })

  it("shows a checkmark next to the selected row", () => {
    const { getByText } = render(
      <NetworkSelector
        visible
        selected={Chain.EVM_SEPOLIA}
        onSelect={() => undefined}
        onClose={() => undefined}
      />
    )
    expect(getByText("✓")).toBeTruthy()
  })

  it("selecting a row fires onSelect with the chain and then onClose", () => {
    const onSelect = jest.fn()
    const onClose = jest.fn()
    const { getByText } = render(
      <NetworkSelector visible selected="all" onSelect={onSelect} onClose={onClose} />
    )
    fireEvent.press(getByText("Sepolia"))
    expect(onSelect).toHaveBeenCalledWith(Chain.EVM_SEPOLIA)
    expect(onClose).toHaveBeenCalled()
  })

  it("renders the 'All networks' option as selectable to clear the filter", () => {
    const onSelect = jest.fn()
    const { getByText } = render(
      <NetworkSelector
        visible
        selected={Chain.EVM_SEPOLIA}
        onSelect={onSelect}
        onClose={() => undefined}
      />
    )
    fireEvent.press(getByText("All networks"))
    expect(onSelect).toHaveBeenCalledWith("all")
  })
})
