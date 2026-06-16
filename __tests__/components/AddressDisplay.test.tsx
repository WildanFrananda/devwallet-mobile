import "reflect-metadata"
import { Alert } from "react-native"
import { render, fireEvent } from "@testing-library/react-native"
import AddressDisplay from "../../src/components/AddressDisplay"

const mockSetString = jest.fn()
jest.mock("@react-native-clipboard/clipboard", () => ({
  __esModule: true,
  default: { setString: (s: string) => mockSetString(s) }
}))

describe("<AddressDisplay />", () => {
  beforeEach(() => {
    mockSetString.mockReset()
    jest.spyOn(Alert, "alert").mockImplementation(() => undefined)
  })

  it("renders label when provided", () => {
    const { getByText } = render(
      <AddressDisplay address="0xabcdefabcdefabcdefabcdef" label="From" />
    )
    expect(getByText("From")).toBeTruthy()
  })

  it("truncates long addresses by default", () => {
    const long = "0xabcdef0123456789abcdef0123456789abcdef01"
    const { queryByText } = render(<AddressDisplay address={long} />)
    expect(queryByText(long)).toBeNull()
  })

  it("renders full address when truncate=false", () => {
    const long = "0xabcdef0123456789abcdef0123456789abcdef01"
    const { getByText } = render(<AddressDisplay address={long} truncate={false} />)
    expect(getByText(long)).toBeTruthy()
  })

  it("press triggers clipboard copy + alert", () => {
    const long = "0xabcdef0123456789abcdef0123456789abcdef01"
    const { getByText } = render(<AddressDisplay address={long} truncate={false} />)
    fireEvent.press(getByText(long))
    expect(mockSetString).toHaveBeenCalledWith(long)
    expect(Alert.alert).toHaveBeenCalledWith("Copied", expect.any(String))
  })
})
