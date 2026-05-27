const mmkvStore: Record<string, string> = {}

jest.mock("react-native-mmkv", () => ({
  createMMKV: () => ({
    getString: (k: string) => mmkvStore[k],
    set: (k: string, v: string) => {
      mmkvStore[k] = v
    }
  })
}))

jest.mock("react-native", () => ({ Platform: { OS: "ios" } }))

import DeviceFingerprintService from "../src/core/auth/device-fingerprint.service"

describe("DeviceFingerprintService", () => {
  beforeEach(() => {
    Object.keys(mmkvStore).forEach(k => delete mmkvStore[k])
  })

  it("generates a 32-hex fingerprint on first call", async () => {
    const svc = new DeviceFingerprintService()
    const fp = await svc.get()
    expect(fp).toMatch(/^[a-f0-9]{32}$/)
  })

  it("returns the same value on subsequent calls within the same instance", async () => {
    const svc = new DeviceFingerprintService()
    const fp1 = await svc.get()
    const fp2 = await svc.get()
    expect(fp1).toBe(fp2)
  })

  it("persists across instances via MMKV", async () => {
    const a = new DeviceFingerprintService()
    const fpA = await a.get()
    const b = new DeviceFingerprintService()
    const fpB = await b.get()
    expect(fpA).toBe(fpB)
  })

  it("resets after MMKV wipe (simulated uninstall)", async () => {
    const a = new DeviceFingerprintService()
    const fpA = await a.get()
    Object.keys(mmkvStore).forEach(k => delete mmkvStore[k])
    const b = new DeviceFingerprintService()
    const fpB = await b.get()
    expect(fpA).not.toBe(fpB)
  })

  it("platform() returns ios on iOS mock", () => {
    const svc = new DeviceFingerprintService()
    expect(svc.platform()).toBe("ios")
  })
})
