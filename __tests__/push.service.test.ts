import "reflect-metadata"

const mockGetToken = jest.fn()
const mockRequestPerm = jest.fn()
const mockOnTokenRefresh = jest.fn().mockReturnValue(() => undefined)

jest.mock("@react-native-firebase/messaging", () => {
  return {
    __esModule: true,
    default: () => ({
      getToken: mockGetToken,
      requestPermission: mockRequestPerm,
      onTokenRefresh: mockOnTokenRefresh
    })
  }
})

// react-native-config globally mocked in jest.setup.js with
// API_BASE_URL=http://localhost:3000/api/v1
jest.mock("react-native", () => ({ Platform: { OS: "android" } }))

const mockFetch = jest.fn()
global.fetch = mockFetch

import PushService from "../src/core/notifications/push.service"
import DeviceFingerprintService from "../src/core/auth/device-fingerprint.service"

describe("PushService", () => {
  let fingerprint: { get: jest.Mock; platform: jest.Mock }
  let svc: PushService

  beforeEach(() => {
    mockGetToken.mockReset()
    mockRequestPerm.mockReset()
    mockFetch.mockReset()
    fingerprint = {
      get: jest.fn().mockResolvedValue("fp-test-1234567890"),
      platform: jest.fn().mockReturnValue("android")
    }
    svc = new PushService(fingerprint as unknown as DeviceFingerprintService)
  })

  it("registerWithBackend: no permission → no fetch", async () => {
    mockRequestPerm.mockResolvedValue(0)
    await svc.registerWithBackend()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("registerWithBackend: permission + token → POSTs to /devices", async () => {
    mockRequestPerm.mockResolvedValue(1)
    mockGetToken.mockResolvedValue("fcm-token-xyz")
    mockFetch.mockResolvedValue({ ok: true })

    await svc.registerWithBackend()
    expect(mockRequestPerm).toHaveBeenCalled()
    expect(mockGetToken).toHaveBeenCalled()
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/devices",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("fcm-token-xyz") as string
      })
    )
  })

  it("registerWithBackend: error swallowed (best-effort)", async () => {
    mockRequestPerm.mockRejectedValue(new Error("perm denied"))
    await expect(svc.registerWithBackend()).resolves.toBeUndefined()
  })

  it("subscribeTokenRefresh registers listener", () => {
    const unsub = svc.subscribeTokenRefresh()
    expect(mockOnTokenRefresh).toHaveBeenCalled()
    expect(typeof unsub).toBe("function")
  })
})
