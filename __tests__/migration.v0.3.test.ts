/**
 * v0.2 → v0.3 migration tests. Verifies atomicity: legacy plaintext row
 * is only overwritten after the staged blob round-trips cleanly.
 */
import "reflect-metadata"

const keychainRows: Record<string, string | null> = {}
const mmkvState: Record<string, unknown> = {}

jest.mock("react-native-keychain", () => ({
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: "x" },
  ACCESS_CONTROL: { BIOMETRY_ANY_OR_DEVICE_PASSCODE: "x" },
  setGenericPassword: jest.fn((_user: string, password: string, options: { service: string }) => {
    keychainRows[options.service] = password
    return Promise.resolve({ service: options.service })
  }),
  getGenericPassword: jest.fn((options: { service: string }) => {
    const value = keychainRows[options.service]
    return Promise.resolve(value ? { username: "primary", password: value } : false)
  }),
  resetGenericPassword: jest.fn((options: { service: string }) => {
    keychainRows[options.service] = null
    return Promise.resolve(true)
  }),
  getSupportedBiometryType: jest.fn().mockResolvedValue(null)
}))

jest.mock("react-native-mmkv", () => ({
  createMMKV: () => ({
    getBoolean: (k: string) => mmkvState[k] as boolean | undefined,
    getString: (k: string) => mmkvState[k] as string | undefined,
    getNumber: (k: string) => mmkvState[k] as number | undefined,
    set: (k: string, v: unknown) => {
      mmkvState[k] = v
    },
    remove: (k: string) => {
      delete mmkvState[k]
    }
  })
}))

jest.mock("react-native-quick-crypto", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockCrypto = require("crypto") as typeof import("crypto")
  return {
    pbkdf2Sync: (pin: string, salt: Buffer, iter: number, keyLen: number, algo: string) =>
      mockCrypto.pbkdf2Sync(pin, Buffer.from(salt), iter, keyLen, algo),
    randomBytes: (size: number) => mockCrypto.randomBytes(size),
    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */
    createCipheriv: (algo: any, key: Buffer, iv: Buffer) =>
      mockCrypto.createCipheriv(algo, Buffer.from(key), Buffer.from(iv)),
    createDecipheriv: (algo: any, key: Buffer, iv: Buffer) =>
      mockCrypto.createDecipheriv(algo, Buffer.from(key), Buffer.from(iv))
    /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */
  }
})

import KeychainService from "../src/core/storage/keychain.service"
import SecureStorageService from "../src/core/auth/secure-storage.service"
import V03EncryptMigration from "../src/core/migration/v0.3-encrypt.migration"

const PLAIN_MNEMONIC = "abandon ability able about above absent absorb abstract absurd abuse access accident"
const PIN = "123456"

function makeMigration(): { migration: V03EncryptMigration; secureStorage: SecureStorageService } {
  const keychain = new KeychainService()
  const secureStorage = new SecureStorageService()
  const migration = new V03EncryptMigration(keychain, secureStorage)
  return { migration, secureStorage }
}

describe("V03EncryptMigration", () => {
  beforeEach(() => {
    Object.keys(keychainRows).forEach(k => delete keychainRows[k])
    Object.keys(mmkvState).forEach(k => delete mmkvState[k])
  })

  it("needsMigration returns false on a fresh install", async () => {
    const { migration } = makeMigration()
    await expect(migration.needsMigration()).resolves.toBe(false)
  })

  it("needsMigration returns true when legacy plaintext detected", async () => {
    keychainRows["com.devwallet.mnemonic"] = PLAIN_MNEMONIC
    const { migration } = makeMigration()
    await expect(migration.needsMigration()).resolves.toBe(true)
  })

  it("needsMigration returns false when keychain already encrypted (and stamps flag)", async () => {
    const { secureStorage } = makeMigration()
    const blob = secureStorage.encrypt(PLAIN_MNEMONIC, PIN)
    keychainRows["com.devwallet.mnemonic"] = blob
    const { migration } = makeMigration()
    await expect(migration.needsMigration()).resolves.toBe(false)
    expect(mmkvState["migration.v0.3.complete"]).toBe(true)
  })

  it("run encrypts plaintext + clears staging + caches PIN + sets flag", async () => {
    keychainRows["com.devwallet.mnemonic"] = PLAIN_MNEMONIC
    const { migration, secureStorage } = makeMigration()
    await migration.run(PIN)

    const stored = keychainRows["com.devwallet.mnemonic"]
    expect(stored).not.toBe(PLAIN_MNEMONIC)
    expect(stored).not.toBeNull()
    if (stored) {
      expect(secureStorage.isEncryptedBlob(stored)).toBe(true)
      expect(secureStorage.decrypt(stored, PIN)).toBe(PLAIN_MNEMONIC)
    }
    expect(keychainRows["com.devwallet.mnemonic.v2"]).toBeNull()
    expect(keychainRows["com.devwallet.pin-cached"]).toBe(PIN)
    expect(mmkvState["migration.v0.3.complete"]).toBe(true)
  })

  it("run is idempotent — second call short-circuits via MMKV flag", async () => {
    keychainRows["com.devwallet.mnemonic"] = PLAIN_MNEMONIC
    const { migration } = makeMigration()
    await migration.run(PIN)
    const firstBlob = keychainRows["com.devwallet.mnemonic"]
    await migration.run(PIN)
    expect(keychainRows["com.devwallet.mnemonic"]).toBe(firstBlob)
  })

  it("run on fresh install (no mnemonic row) is a safe no-op", async () => {
    const { migration } = makeMigration()
    await expect(migration.run(PIN)).resolves.toBeUndefined()
    expect(keychainRows["com.devwallet.mnemonic"]).toBeFalsy()
    expect(keychainRows["com.devwallet.pin-cached"]).toBeFalsy()
  })

  it("verify-failure path leaves the legacy plaintext intact", async () => {
    keychainRows["com.devwallet.mnemonic"] = PLAIN_MNEMONIC
    const { migration, secureStorage } = makeMigration()
    // Force decrypt to throw to simulate corrupt staged blob.
    const originalDecrypt = secureStorage.decrypt.bind(secureStorage)
    const spy = jest.spyOn(secureStorage, "decrypt").mockImplementation(() => {
      throw new Error("synthetic corruption")
    })

    await expect(migration.run(PIN)).rejects.toThrow(/Migration verify decrypt failed/)
    // Legacy plaintext must remain — migration must not destroy it.
    expect(keychainRows["com.devwallet.mnemonic"]).toBe(PLAIN_MNEMONIC)
    expect(keychainRows["com.devwallet.mnemonic.v2"]).toBeNull()
    expect(mmkvState["migration.v0.3.complete"]).toBeUndefined()

    spy.mockRestore()
    void originalDecrypt
  })

  it("reset clears flag so the next run executes again", async () => {
    keychainRows["com.devwallet.mnemonic"] = PLAIN_MNEMONIC
    const { migration } = makeMigration()
    await migration.run(PIN)
    expect(mmkvState["migration.v0.3.complete"]).toBe(true)
    migration.reset()
    expect(mmkvState["migration.v0.3.complete"]).toBe(false)
  })
})
