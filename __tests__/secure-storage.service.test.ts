/**
 * SecureStorage roundtrip tests. RNQC's `pbkdf2Sync` + `createCipheriv` are
 * mocked since the real native bindings are not loaded in the Jest VM.
 * Mock implementations use Node's built-in crypto for deterministic behavior.
 */
jest.mock("react-native-quick-crypto", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockCrypto = require("crypto") as typeof import("crypto")
  return {
    pbkdf2Sync: mockCrypto.pbkdf2Sync,
    randomBytes: mockCrypto.randomBytes,
    createCipheriv: mockCrypto.createCipheriv,
    createDecipheriv: mockCrypto.createDecipheriv
  }
})

import SecureStorageService from "../src/core/auth/secure-storage.service"

describe("SecureStorageService", () => {
  const svc = new SecureStorageService()
  const PIN = "123456"
  const PLAIN = "abandon ability able about above absent absorb abstract absurd abuse access accident"

  it("encrypt → decrypt roundtrip recovers plaintext", () => {
    const blob = svc.encrypt(PLAIN, PIN)
    const restored = svc.decrypt(blob, PIN)
    expect(restored).toBe(PLAIN)
  })

  it("encrypt with same input produces different blob each call (random salt + iv)", () => {
    const a = svc.encrypt(PLAIN, PIN)
    const b = svc.encrypt(PLAIN, PIN)
    expect(a).not.toBe(b)
  })

  it("wrong PIN throws decryption failure", () => {
    const blob = svc.encrypt(PLAIN, PIN)
    expect(() => svc.decrypt(blob, "999999")).toThrow(/wrong PIN|Decryption failed/i)
  })

  it("tampered ciphertext throws GCM auth failure", () => {
    const blob = svc.encrypt(PLAIN, PIN)
    const parsed = JSON.parse(blob) as { ctHex: string }
    const tampered = JSON.stringify({
      ...parsed,
      ctHex: parsed.ctHex.replace(/^./, c => (c === "0" ? "1" : "0"))
    })
    expect(() => svc.decrypt(tampered, PIN)).toThrow(/wrong PIN|Decryption failed/i)
  })

  it("empty PIN rejected on encrypt + decrypt", () => {
    expect(() => svc.encrypt(PLAIN, "")).toThrow(/PIN required/)
    const blob = svc.encrypt(PLAIN, PIN)
    expect(() => svc.decrypt(blob, "")).toThrow(/PIN required/)
  })

  it("isEncryptedBlob detects v2 blob", () => {
    const blob = svc.encrypt(PLAIN, PIN)
    expect(svc.isEncryptedBlob(blob)).toBe(true)
    expect(svc.isEncryptedBlob(PLAIN)).toBe(false)
    expect(svc.isEncryptedBlob("{\"v\":1}")).toBe(false)
    expect(svc.isEncryptedBlob("not json {")).toBe(false)
  })

  it("rejects unknown blob format on decrypt", () => {
    const malformed = JSON.stringify({ v: 99, saltHex: "00" })
    expect(() => svc.decrypt(malformed, PIN)).toThrow(/Unknown encrypted blob format/)
  })
})
