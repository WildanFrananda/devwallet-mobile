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
import { Chain } from "../src/core/constants/chains.enum"

jest.mock("react-native-device-info", () => ({
  __esModule: true,
  default: { getUniqueId: jest.fn().mockResolvedValue("test-device-id") }
}))

const TEST_MNEMONIC = "test test test test test test test test test test test junk"
const EXPECTED_EVM_0 = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"

const keychainState: { mnemonic: string | null } = { mnemonic: null }
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

jest.mock("react-native-quick-crypto", () => ({
  pbkdf2Sync: jest.fn(() => Buffer.alloc(32, 1)),
  randomBytes: jest.fn(() => Buffer.alloc(32, 2))
}))

jest.mock("react-native-keychain", () => ({
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY" },
  ACCESS_CONTROL: { BIOMETRY_ANY_OR_DEVICE_PASSCODE: "BIOMETRY_ANY_OR_DEVICE_PASSCODE" },
  setGenericPassword: jest.fn((_user: string, password: string) => {
    keychainState.mnemonic = password
    return Promise.resolve({ service: "mock" })
  }),
  getGenericPassword: jest.fn(() =>
    Promise.resolve(keychainState.mnemonic ? { username: "primary", password: keychainState.mnemonic } : false)
  ),
  resetGenericPassword: jest.fn(() => {
    keychainState.mnemonic = null
    return Promise.resolve(true)
  }),
  getSupportedBiometryType: jest.fn().mockResolvedValue(null)
}))

function makeRepo(): WalletRepositoryImpl {
  return new WalletRepositoryImpl(
    new KeyringService(),
    new KeychainService(),
    new BalanceDatasource(),
    new TokenDatasource(),
    new TxHistoryDatasource(),
    new SignerDatasource(),
    new PinService(),
    new DeviceBindingService()
  )
}

describe("WalletRepository", () => {
  beforeEach(() => {
    keychainState.mnemonic = null
    Object.keys(mmkvState).forEach(k => delete mmkvState[k])
    mmkvState["devwallet.installed"] = true
  })

  it("hasWallet returns false initially", async () => {
    const repo = makeRepo()
    await expect(repo.hasWallet()).resolves.toBe(false)
  })

  it("hasWallet wipes keychain on fresh install (MMKV flag absent)", async () => {
    const repo = makeRepo()
    keychainState.mnemonic = "leftover from prior install"
    delete mmkvState["devwallet.installed"]
    await expect(repo.hasWallet()).resolves.toBe(false)
    expect(keychainState.mnemonic).toBe(null)
    expect(mmkvState["devwallet.installed"]).toBe(true)
  })

  it("createFromMnemonic persists + unlocks + returns primary EVM account", async () => {
    const repo = makeRepo()
    const account = await repo.createFromMnemonic(TEST_MNEMONIC, false)
    expect(account.address.toLowerCase()).toBe(EXPECTED_EVM_0)
    expect(account.chain).toBe(Chain.EVM_SEPOLIA)
    expect(repo.isUnlocked()).toBe(true)
    await expect(repo.hasWallet()).resolves.toBe(true)
  })

  it("restore rejects invalid mnemonic", async () => {
    const repo = makeRepo()
    await expect(repo.restore("not a real mnemonic", false)).rejects.toThrow("Invalid mnemonic")
  })

  it("unlock loads keyring from keychain on a fresh instance", async () => {
    const repo = makeRepo()
    await repo.createFromMnemonic(TEST_MNEMONIC, false)

    // Simulate app restart: new repo instance, mnemonic still in keychain.
    const fresh = makeRepo()
    expect(fresh.isUnlocked()).toBe(false)

    const account = await fresh.unlock("biometric", undefined, "Test prompt")
    expect(account.address.toLowerCase()).toBe(EXPECTED_EVM_0)
    expect(fresh.isUnlocked()).toBe(true)
  })

  it("getCurrent throws when locked", async () => {
    const repo = makeRepo()
    await expect(repo.getCurrent()).rejects.toThrow("Keyring locked")
  })

  it("deriveAll returns 8 accounts after unlock", async () => {
    const repo = makeRepo()
    await repo.createFromMnemonic(TEST_MNEMONIC, false)
    const accounts = await repo.deriveAll(0)
    expect(accounts).toHaveLength(8)
  })

  it("clear wipes keychain + keyring", async () => {
    const repo = makeRepo()
    await repo.createFromMnemonic(TEST_MNEMONIC, false)
    await repo.clear()
    expect(repo.isUnlocked()).toBe(false)
    await expect(repo.hasWallet()).resolves.toBe(false)
  })
})
