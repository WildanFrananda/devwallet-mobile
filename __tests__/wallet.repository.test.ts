import "reflect-metadata"
import WalletRepositoryImpl from "../src/repositories/wallet.repository.impl"
import KeyringService from "../src/core/crypto/keyring/keyring.service"
import KeychainService from "../src/core/storage/keychain.service"
import BalanceDatasource from "../src/datasources/balance/balance.datasource"
import TokenDatasource from "../src/datasources/token/token.datasource"
import TxHistoryDatasource from "../src/datasources/tx-history/tx-history.datasource"
import SignerDatasource from "../src/datasources/signer/signer.datasource"
import PinService from "../src/core/auth/pin.service"
import DeviceBindingService from "../src/core/auth/device-binding.service"
import SecureStorageService from "../src/core/auth/secure-storage.service"
import { Chain } from "../src/core/constants/chains.enum"

jest.mock("react-native-device-info", () => ({
  __esModule: true,
  default: { getUniqueId: jest.fn().mockResolvedValue("test-device-id") }
}))

const TEST_MNEMONIC = "test test test test test test test test test test test junk"
const EXPECTED_EVM_0 = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
const TEST_PIN = "123456"

/** Per-service in-memory keychain so the encrypted-mnemonic row, the cached
 * PIN row, and the staging migration row don't collide. */
const keychainRows: Record<string, string | null> = {}
const mmkvState: Record<string, unknown> = {}

jest.mock("react-native-mmkv", () => ({
  createMMKV: () => ({
    getBoolean: (key: string) => mmkvState[key] as boolean | undefined,
    getNumber: (key: string) => mmkvState[key] as number | undefined,
    getString: (key: string) => mmkvState[key] as string | undefined,
    set: (key: string, value: unknown) => {
      mmkvState[key] = value
    },
    remove: (key: string) => {
      delete mmkvState[key]
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

jest.mock("react-native-keychain", () => ({
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY" },
  ACCESS_CONTROL: { BIOMETRY_ANY_OR_DEVICE_PASSCODE: "BIOMETRY_ANY_OR_DEVICE_PASSCODE" },
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

type RepoBundle = {
  repo: WalletRepositoryImpl
  pin: PinService
}

function makeRepoBundle(): RepoBundle {
  const pin = new PinService()
  const repo = new WalletRepositoryImpl(
    new KeyringService(),
    new KeychainService(),
    new BalanceDatasource(),
    new TokenDatasource(),
    new TxHistoryDatasource(),
    new SignerDatasource(),
    pin,
    new DeviceBindingService(),
    new SecureStorageService()
  )
  return { repo, pin }
}

function makeRepo(): WalletRepositoryImpl {
  return makeRepoBundle().repo
}

describe("WalletRepository", () => {
  beforeEach(() => {
    Object.keys(keychainRows).forEach(k => delete keychainRows[k])
    Object.keys(mmkvState).forEach(k => delete mmkvState[k])
    mmkvState["devwallet.installed"] = true
  })

  it("hasWallet returns false initially", async () => {
    const repo = makeRepo()
    await expect(repo.hasWallet()).resolves.toBe(false)
  })

  it("hasWallet wipes keychain on fresh install (MMKV flag absent)", async () => {
    const repo = makeRepo()
    keychainRows["com.devwallet.mnemonic"] = "leftover from prior install"
    delete mmkvState["devwallet.installed"]
    await expect(repo.hasWallet()).resolves.toBe(false)
    expect(keychainRows["com.devwallet.mnemonic"]).toBe(null)
    expect(mmkvState["devwallet.installed"]).toBe(true)
  })

  it("createFromMnemonic loads keyring but does NOT persist", async () => {
    const repo = makeRepo()
    const account = await repo.createFromMnemonic(TEST_MNEMONIC)
    expect(account.address.toLowerCase()).toBe(EXPECTED_EVM_0)
    expect(account.chain).toBe(Chain.EVM_SEPOLIA)
    expect(repo.isUnlocked()).toBe(true)
    // hasWallet still false — keychain not yet written
    await expect(repo.hasWallet()).resolves.toBe(false)
  })

  it("persistEncrypted writes encrypted blob + cached PIN", async () => {
    const repo = makeRepo()
    await repo.createFromMnemonic(TEST_MNEMONIC)
    await repo.persistEncrypted(TEST_PIN)
    expect(keychainRows["com.devwallet.mnemonic"]).toMatch(/"v":2/)
    expect(keychainRows["com.devwallet.pin-cached"]).toBe(TEST_PIN)
    await expect(repo.hasWallet()).resolves.toBe(true)
  })

  it("restore rejects invalid mnemonic", async () => {
    const repo = makeRepo()
    await expect(repo.restore("not a real mnemonic")).rejects.toThrow("Invalid mnemonic")
  })

  it("unlock via PIN decrypts blob on a fresh instance", async () => {
    const { repo, pin } = makeRepoBundle()
    await repo.createFromMnemonic(TEST_MNEMONIC)
    await pin.setPin(TEST_PIN)
    await repo.persistEncrypted(TEST_PIN)

    const fresh = makeRepo()
    expect(fresh.isUnlocked()).toBe(false)

    const account = await fresh.unlock("pin", TEST_PIN, "Test prompt")
    expect(account.address.toLowerCase()).toBe(EXPECTED_EVM_0)
    expect(fresh.isUnlocked()).toBe(true)
  })

  it("unlock via biometric reads cached PIN then decrypts", async () => {
    const { repo, pin } = makeRepoBundle()
    await repo.createFromMnemonic(TEST_MNEMONIC)
    await pin.setPin(TEST_PIN)
    await repo.persistEncrypted(TEST_PIN)

    const fresh = makeRepo()
    const account = await fresh.unlock("biometric", undefined, "Use biometric")
    expect(account.address.toLowerCase()).toBe(EXPECTED_EVM_0)
  })

  it("unlock via PIN rejects wrong PIN", async () => {
    const { repo, pin } = makeRepoBundle()
    await repo.createFromMnemonic(TEST_MNEMONIC)
    await pin.setPin(TEST_PIN)
    await repo.persistEncrypted(TEST_PIN)

    const fresh = makeRepo()
    await expect(fresh.unlock("pin", "000000")).rejects.toThrow("Incorrect PIN")
  })

  it("getCurrent throws when locked", async () => {
    const repo = makeRepo()
    await expect(repo.getCurrent()).rejects.toThrow("Keyring locked")
  })

  it("deriveAll returns 8 accounts after unlock", async () => {
    const repo = makeRepo()
    await repo.createFromMnemonic(TEST_MNEMONIC)
    const accounts = await repo.deriveAll(0)
    expect(accounts).toHaveLength(8)
  })

  it("clear wipes mnemonic row + cached PIN row + keyring", async () => {
    const repo = makeRepo()
    await repo.createFromMnemonic(TEST_MNEMONIC)
    await repo.persistEncrypted(TEST_PIN)
    await repo.clear()
    expect(repo.isUnlocked()).toBe(false)
    expect(keychainRows["com.devwallet.mnemonic"]).toBeFalsy()
    expect(keychainRows["com.devwallet.pin-cached"]).toBeFalsy()
    await expect(repo.hasWallet()).resolves.toBe(false)
  })
})
