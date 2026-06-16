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

// Default no-op stubs so any indirect VM/service import does not crash.
// Tests that exercise these libs override locally via jest.mock(...) at
// the top of the spec file (see change-pin / secure-storage / migration).
jest.mock("react-native-quick-crypto", () => ({
  pbkdf2Sync: jest.fn(() => Buffer.alloc(32, 1)),
  randomBytes: jest.fn(() => Buffer.alloc(32, 2)),
  createCipheriv: jest.fn(),
  createDecipheriv: jest.fn()
}))

jest.mock("@react-native-firebase/messaging", () => ({
  __esModule: true,
  default: () => ({
    getToken: jest.fn().mockResolvedValue("test-fcm-token"),
    requestPermission: jest.fn().mockResolvedValue(1),
    hasPermission: jest.fn().mockResolvedValue(1),
    onTokenRefresh: jest.fn(() => () => undefined),
    onMessage: jest.fn(() => () => undefined),
    onNotificationOpenedApp: jest.fn(() => () => undefined),
    getInitialNotification: jest.fn().mockResolvedValue(null),
    setBackgroundMessageHandler: jest.fn()
  })
}))
