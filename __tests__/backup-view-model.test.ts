import "reflect-metadata"
import BackupViewModel from "../src/viewmodels/BackupViewModel"
import type PinService from "../src/core/auth/pin.service"
import type KeychainService from "../src/core/storage/keychain.service"
import type SecureStorageService from "../src/core/auth/secure-storage.service"
import type WalletRepository from "../src/repositories/wallet.repository"
import type Account from "../src/models/account.model"
import { Chain } from "../src/core/constants/chains.enum"

const MNEMONIC = "test test test test test test test test test test test junk"

function acct(chain: Chain, index = 0): Account {
  return {
    chain,
    address: `0xaddr-${chain}`,
    privateKey: `0xpk-${chain}` as `0x${string}`,
    publicKey: "0xpub" as `0x${string}`,
    path: "m/44'/60'/0'/0/0",
    index
  } as unknown as Account
}

function makeVm(
  over: {
    verifyPin?: boolean
    blob?: string | null
    encrypted?: boolean
    accounts?: Account[]
  } = {}
): {
  vm: BackupViewModel
  pin: jest.Mocked<PinService>
  keychain: jest.Mocked<KeychainService>
  secure: jest.Mocked<SecureStorageService>
  wallet: jest.Mocked<WalletRepository>
} {
  const pin = {
    verifyPin: jest.fn(async () => over.verifyPin ?? true)
  } as unknown as jest.Mocked<PinService>
  const keychain = {
    getMnemonic: jest.fn(async () => (over.blob === undefined ? "ENC_BLOB" : over.blob))
  } as unknown as jest.Mocked<KeychainService>
  const secure = {
    isEncryptedBlob: jest.fn(() => over.encrypted ?? true),
    decrypt: jest.fn(() => MNEMONIC)
  } as unknown as jest.Mocked<SecureStorageService>
  const wallet = {
    deriveAll: jest.fn(async () => over.accounts ?? [acct(Chain.EVM_SEPOLIA), acct(Chain.SOLANA_DEVNET)])
  } as unknown as jest.Mocked<WalletRepository>
  return { vm: new BackupViewModel(pin, keychain, secure, wallet), pin, keychain, secure, wallet }
}

async function flush(): Promise<void> {
  for (let i = 0; i < 6; i++) await Promise.resolve()
}

describe("BackupViewModel", () => {
  it("starts idle", () => {
    const { vm } = makeVm()
    expect(vm.reveal$.value.status).toBe("idle")
  })

  it("reveals the decrypted phrase + every chain's private key on correct PIN", async () => {
    const { vm, pin, secure, wallet } = makeVm()
    vm.reveal("123456")
    await flush()
    const state = vm.reveal$.value
    expect(state.status).toBe("success")
    if (state.status === "success") {
      expect(state.data.words).toEqual(MNEMONIC.split(" "))
      expect(state.data.accounts).toHaveLength(2)
      expect(state.data.accounts[0]!.privateKey).toBe("0xpk-evm:sepolia")
    }
    expect(pin.verifyPin).toHaveBeenCalledWith("123456")
    expect(secure.decrypt).toHaveBeenCalledWith("ENC_BLOB", "123456")
    expect(wallet.deriveAll).toHaveBeenCalled()
  })

  it("errors without decrypting when the PIN is wrong", async () => {
    const { vm, secure, wallet } = makeVm({ verifyPin: false })
    vm.reveal("000000")
    await flush()
    const state = vm.reveal$.value
    expect(state.status).toBe("error")
    if (state.status === "error") expect(state.message).toMatch(/incorrect pin/i)
    expect(secure.decrypt).not.toHaveBeenCalled()
    expect(wallet.deriveAll).not.toHaveBeenCalled()
  })

  it("errors when the keychain has no mnemonic blob", async () => {
    const { vm } = makeVm({ blob: null })
    vm.reveal("123456")
    await flush()
    expect(vm.reveal$.value.status).toBe("error")
  })

  it("uses the raw value when the blob is plaintext (pre-v0.3, not encrypted)", async () => {
    const { vm, secure } = makeVm({ blob: MNEMONIC, encrypted: false })
    vm.reveal("123456")
    await flush()
    const state = vm.reveal$.value
    expect(state.status).toBe("success")
    if (state.status === "success") expect(state.data.words).toEqual(MNEMONIC.split(" "))
    expect(secure.decrypt).not.toHaveBeenCalled()
  })

  it("hide() drops revealed secrets back to idle", async () => {
    const { vm } = makeVm()
    vm.reveal("123456")
    await flush()
    expect(vm.reveal$.value.status).toBe("success")
    vm.hide()
    expect(vm.reveal$.value.status).toBe("idle")
  })
})
