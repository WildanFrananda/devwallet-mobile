require("reflect-metadata")

jest.mock("react-native-config", () => ({
  __esModule: true,
  default: {
    API_BASE_URL: "http://localhost:3000/api/v1",
    WS_BASE_URL: "ws://localhost:3000/ws",
    DEFAULT_CHAIN: "evm:sepolia"
  }
}))

jest.mock("react-native-keychain", () => ({}))
jest.mock("react-native-mmkv", () => ({
  MMKV: jest.fn().mockImplementation(() => ({ set: jest.fn(), getString: jest.fn() }))
}))
jest.mock("react-native-biometrics", () => ({}))
