import "reflect-metadata"
import { render, fireEvent } from "@testing-library/react-native"
import AmountInput from "../../src/components/AmountInput"

describe("<AmountInput />", () => {
  it("renders symbol + placeholder + label", () => {
    const { getByText, getByPlaceholderText } = render(
      <AmountInput value="" symbol="ETH" label="Amount" onChange={() => undefined} />
    )
    expect(getByText("Amount")).toBeTruthy()
    expect(getByText("ETH")).toBeTruthy()
    expect(getByPlaceholderText("0.0")).toBeTruthy()
  })

  it("forwards typed value to onChange", () => {
    const onChange = jest.fn()
    const { getByPlaceholderText } = render(
      <AmountInput value="" symbol="ETH" onChange={onChange} />
    )
    fireEvent.changeText(getByPlaceholderText("0.0"), "0.123")
    expect(onChange).toHaveBeenCalledWith("0.123")
  })

  it("renders MAX button only when onMaxPress is provided", () => {
    const { queryByText, rerender } = render(
      <AmountInput value="" symbol="ETH" onChange={() => undefined} />
    )
    expect(queryByText("MAX")).toBeNull()
    rerender(<AmountInput value="" symbol="ETH" onChange={() => undefined} onMaxPress={jest.fn()} />)
    expect(queryByText("MAX")).toBeTruthy()
  })

  it("MAX press fires callback", () => {
    const onMaxPress = jest.fn()
    const { getByText } = render(
      <AmountInput value="" symbol="ETH" onChange={() => undefined} onMaxPress={onMaxPress} />
    )
    fireEvent.press(getByText("MAX"))
    expect(onMaxPress).toHaveBeenCalled()
  })

  it("shows spinner when maxLoading=true (hides MAX label)", () => {
    const { queryByText } = render(
      <AmountInput
        value=""
        symbol="ETH"
        onChange={() => undefined}
        onMaxPress={jest.fn()}
        maxLoading
      />
    )
    expect(queryByText("MAX")).toBeNull()
  })

  it("custom placeholder overrides default", () => {
    const { getByPlaceholderText } = render(
      <AmountInput value="" symbol="ETH" onChange={() => undefined} placeholder="Enter amount" />
    )
    expect(getByPlaceholderText("Enter amount")).toBeTruthy()
  })
})
