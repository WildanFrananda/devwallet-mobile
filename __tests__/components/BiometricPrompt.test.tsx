import "reflect-metadata"
import { render } from "@testing-library/react-native"
import BiometricPrompt from "../../src/components/BiometricPrompt"

const mockUseBiometric = jest.fn()
jest.mock("../../src/hooks/useBiometric", () => ({
  __esModule: true,
  default: () => mockUseBiometric()
}))

describe("<BiometricPrompt />", () => {
  it("renders spinner while loading", () => {
    mockUseBiometric.mockReturnValue({ loading: true, available: false, type: null })
    const { queryByText } = render(<BiometricPrompt />)
    expect(queryByText(/biometric/i)).toBeNull()
  })

  it("renders fallback message when biometric unavailable", () => {
    mockUseBiometric.mockReturnValue({ loading: false, available: false, type: null })
    const { getByText } = render(<BiometricPrompt />)
    expect(getByText(/not available/i)).toBeTruthy()
  })

  it("renders FaceID label when iOS Face ID", () => {
    mockUseBiometric.mockReturnValue({ loading: false, available: true, type: "FaceID" })
    const { getByText } = render(<BiometricPrompt message="Tap to confirm" />)
    expect(getByText("Face ID")).toBeTruthy()
    expect(getByText("Tap to confirm")).toBeTruthy()
  })

  it("renders Touch ID label", () => {
    mockUseBiometric.mockReturnValue({ loading: false, available: true, type: "TouchID" })
    const { getByText } = render(<BiometricPrompt />)
    expect(getByText("Touch ID")).toBeTruthy()
  })

  it("renders Fingerprint label for Android", () => {
    mockUseBiometric.mockReturnValue({
      loading: false,
      available: true,
      type: "Fingerprint"
    })
    const { getByText } = render(<BiometricPrompt />)
    expect(getByText("Fingerprint")).toBeTruthy()
  })

  it("fallback label when type unknown", () => {
    mockUseBiometric.mockReturnValue({ loading: false, available: true, type: "Unknown" })
    const { getByText } = render(<BiometricPrompt />)
    expect(getByText(/biometric/)).toBeTruthy()
  })
})
