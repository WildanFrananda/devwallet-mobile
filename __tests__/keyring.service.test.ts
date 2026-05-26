import KeyringService from "../src/core/crypto/keyring/keyring.service"
import Bip44Paths from "../src/core/crypto/bip44"
import Bip39 from "../src/core/crypto/bip39"
import { Chain } from "../src/core/constants/chains.enum"

const TEST_MNEMONIC = "test test test test test test test test test test test junk"
const EXPECTED_EVM_INDEX_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
const EXPECTED_EVM_INDEX_1 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"

describe("Bip39", () => {
  it("generates valid 12-word mnemonic by default", () => {
    const mn = Bip39.generate()
    expect(mn.split(" ")).toHaveLength(12)
    expect(Bip39.validate(mn)).toBe(true)
  })

  it("generates 24-word mnemonic at 256 strength", () => {
    const mn = Bip39.generate(256)
    expect(mn.split(" ")).toHaveLength(24)
    expect(Bip39.validate(mn)).toBe(true)
  })

  it("rejects garbage", () => {
    expect(Bip39.validate("not a real mnemonic")).toBe(false)
  })

  it("toSeed throws on invalid mnemonic", () => {
    expect(() => Bip39.toSeed("garbage words here")).toThrow("Invalid mnemonic")
  })
})

describe("Bip44Paths", () => {
  it("builds Ethereum BIP44 path for EVM chains", () => {
    expect(Bip44Paths.path(Chain.EVM_SEPOLIA, 0)).toBe("m/44'/60'/0'/0/0")
    expect(Bip44Paths.path(Chain.EVM_SEPOLIA, 5)).toBe("m/44'/60'/0'/0/5")
    expect(Bip44Paths.path(Chain.EVM_HOLESKY, 0)).toBe("m/44'/60'/0'/0/0")
    expect(Bip44Paths.path(Chain.EVM_POLYGON_AMOY, 0)).toBe("m/44'/60'/0'/0/0")
    expect(Bip44Paths.path(Chain.EVM_BASE_SEPOLIA, 0)).toBe("m/44'/60'/0'/0/0")
  })

  it("uses BIP84 purpose for Bitcoin testnet", () => {
    expect(Bip44Paths.purpose(Chain.BITCOIN_TESTNET)).toBe(84)
    expect(Bip44Paths.path(Chain.BITCOIN_TESTNET, 0)).toBe("m/84'/1'/0'/0/0")
  })

  it("uses SLIP-0044 coin types for non-EVM", () => {
    expect(Bip44Paths.coinType(Chain.BITCOIN_TESTNET)).toBe(1)
    expect(Bip44Paths.coinType(Chain.SOLANA_DEVNET)).toBe(501)
    expect(Bip44Paths.coinType(Chain.COSMOS_THETA)).toBe(118)
    expect(Bip44Paths.coinType(Chain.XRPL_TESTNET)).toBe(144)
    expect(Bip44Paths.coinType(Chain.STARKNET_SEPOLIA)).toBe(9004)
  })

  it("hardenedPath produces Solana SLIP-0010 path", () => {
    expect(Bip44Paths.hardenedPath(Chain.SOLANA_DEVNET, 0)).toBe("m/44'/501'/0'/0'")
    expect(Bip44Paths.hardenedPath(Chain.SOLANA_DEVNET, 3)).toBe("m/44'/501'/0'/3'")
  })

  it("supports account + change overrides", () => {
    expect(Bip44Paths.path(Chain.EVM_SEPOLIA, 3, 2, 1)).toBe("m/44'/60'/2'/1/3")
  })
})

describe("KeyringService", () => {
  it("starts locked", () => {
    const svc = new KeyringService()
    expect(svc.isUnlocked()).toBe(false)
  })

  it("rejects derive when locked", async () => {
    const svc = new KeyringService()
    await expect(svc.deriveAccount(Chain.EVM_SEPOLIA)).rejects.toThrow("Keyring locked")
  })

  it("derives Hardhat account #0 for Sepolia", async () => {
    const svc = new KeyringService()
    svc.loadMnemonic(TEST_MNEMONIC)
    const account = await svc.deriveAccount(Chain.EVM_SEPOLIA, 0)
    expect(account.address.toLowerCase()).toBe(EXPECTED_EVM_INDEX_0.toLowerCase())
    expect(account.path).toBe("m/44'/60'/0'/0/0")
    expect(account.chain).toBe(Chain.EVM_SEPOLIA)
    expect(account.index).toBe(0)
  })

  it("derives Hardhat account #1 at index 1", async () => {
    const svc = new KeyringService()
    svc.loadMnemonic(TEST_MNEMONIC)
    const account = await svc.deriveAccount(Chain.EVM_SEPOLIA, 1)
    expect(account.address.toLowerCase()).toBe(EXPECTED_EVM_INDEX_1.toLowerCase())
  })

  it("all EVM chains derive the same address at index 0 (same coin type)", async () => {
    const svc = new KeyringService()
    svc.loadMnemonic(TEST_MNEMONIC)
    const accounts = await svc.deriveEvmAll(0)
    expect(accounts).toHaveLength(5)
    accounts.forEach(a => {
      expect(a.address.toLowerCase()).toBe(EXPECTED_EVM_INDEX_0.toLowerCase())
    })
  })

  it("derives native segwit Bitcoin testnet address (tb1q...)", async () => {
    const svc = new KeyringService()
    svc.loadMnemonic(TEST_MNEMONIC)
    const account = await svc.deriveAccount(Chain.BITCOIN_TESTNET, 0)
    expect(account.chain).toBe(Chain.BITCOIN_TESTNET)
    expect(account.address.startsWith("tb1q")).toBe(true)
    expect(account.path).toBe("m/84'/1'/0'/0/0")
  })

  it("Bitcoin derivation is deterministic", async () => {
    const svc = new KeyringService()
    svc.loadMnemonic(TEST_MNEMONIC)
    const a0 = await svc.deriveAccount(Chain.BITCOIN_TESTNET, 0)
    const a1 = await svc.deriveAccount(Chain.BITCOIN_TESTNET, 0)
    expect(a0.address).toBe(a1.address)
  })

  it("derives Solana devnet base58 address", async () => {
    const svc = new KeyringService()
    svc.loadMnemonic(TEST_MNEMONIC)
    const account = await svc.deriveAccount(Chain.SOLANA_DEVNET, 0)
    expect(account.chain).toBe(Chain.SOLANA_DEVNET)
    expect(account.path).toBe("m/44'/501'/0'/0'")
    expect(account.address.length).toBeGreaterThanOrEqual(32)
    expect(account.address.length).toBeLessThanOrEqual(44)
    expect(/^[1-9A-HJ-NP-Za-km-z]+$/.test(account.address)).toBe(true)
  })

  it("Solana derivation is deterministic across address indices", async () => {
    const svc = new KeyringService()
    svc.loadMnemonic(TEST_MNEMONIC)
    const a0 = await svc.deriveAccount(Chain.SOLANA_DEVNET, 0)
    const a1 = await svc.deriveAccount(Chain.SOLANA_DEVNET, 1)
    expect(a0.address).not.toBe(a1.address)
    const a0again = await svc.deriveAccount(Chain.SOLANA_DEVNET, 0)
    expect(a0again.address).toBe(a0.address)
  })

  it("derives Cosmos Hub bech32 address (cosmos1...)", async () => {
    const svc = new KeyringService()
    svc.loadMnemonic(TEST_MNEMONIC)
    const account = await svc.deriveAccount(Chain.COSMOS_THETA, 0)
    expect(account.chain).toBe(Chain.COSMOS_THETA)
    expect(account.address.startsWith("cosmos1")).toBe(true)
    expect(account.path).toBe("m/44'/118'/0'/0/0")
  })

  it("derives XRPL classic address (starts with r)", async () => {
    const svc = new KeyringService()
    svc.loadMnemonic(TEST_MNEMONIC)
    const account = await svc.deriveAccount(Chain.XRPL_TESTNET, 0)
    expect(account.chain).toBe(Chain.XRPL_TESTNET)
    expect(account.address.startsWith("r")).toBe(true)
    expect(account.path).toBe("m/44'/144'/0'/0/0")
  })

  it("derives StarkNet pubkey (hex 0x...)", async () => {
    const svc = new KeyringService()
    svc.loadMnemonic(TEST_MNEMONIC)
    const account = await svc.deriveAccount(Chain.STARKNET_SEPOLIA, 0)
    expect(account.chain).toBe(Chain.STARKNET_SEPOLIA)
    expect(account.address.startsWith("0x")).toBe(true)
    expect(account.path).toBe("m/44'/9004'/0'/0/0")
  })

  it("deriveSupportedAll returns 10 accounts (5 EVM + BTC + SOL + Cosmos + XRPL + Stark)", async () => {
    const svc = new KeyringService()
    svc.loadMnemonic(TEST_MNEMONIC)
    const accounts = await svc.deriveSupportedAll(0)
    expect(accounts).toHaveLength(10)
    const chains = accounts.map(a => a.chain)
    expect(chains).toContain(Chain.BITCOIN_TESTNET)
    expect(chains).toContain(Chain.SOLANA_DEVNET)
    expect(chains).toContain(Chain.COSMOS_THETA)
    expect(chains).toContain(Chain.XRPL_TESTNET)
    expect(chains).toContain(Chain.STARKNET_SEPOLIA)
  })

  it("clear() locks the keyring", () => {
    const svc = new KeyringService()
    svc.loadMnemonic(TEST_MNEMONIC)
    expect(svc.isUnlocked()).toBe(true)
    svc.clear()
    expect(svc.isUnlocked()).toBe(false)
  })

  it("Account.toJSON omits privateKey", async () => {
    const svc = new KeyringService()
    svc.loadMnemonic(TEST_MNEMONIC)
    const account = await svc.deriveAccount(Chain.EVM_SEPOLIA)
    const json = account.toJSON() as Record<string, unknown>
    expect(json.privateKey).toBeUndefined()
    expect(json.address).toBe(account.address)
  })
})
