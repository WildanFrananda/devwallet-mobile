import { mnemonicToSeedSync, validateMnemonic } from "@scure/bip39"
import { wordlist } from "@scure/bip39/wordlists/english.js"
import { HDKey } from "@scure/bip32"
import { privateKeyToAccount } from "viem/accounts"
import { bytesToHex, type Hex } from "viem"

/**
 * Phase 1 Day 1 PoC — Risk #2 mitigation.
 *
 * Confirms react-native-quick-crypto polyfill works for the full BIP39 +
 * BIP44 + secp256k1 derivation chain on a real device. Throwaway class;
 * KeyringService replaces it once verified.
 */

type DerivedAccount = {
  address: `0x${string}`
  privateKey: Hex
  path: string
}

type PocResult = {
  passed: boolean
  derived: string
  expected: string
  path: string
  error?: string
}

class SepoliaDerivationPoc {
  public static readonly TEST_MNEMONIC = "test test test test test test test test test test test junk"

  // BIP44 standard vector — Hardhat / Foundry default account #0
  public static readonly EXPECTED_ADDRESS_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

  public static derive(mnemonic: string = SepoliaDerivationPoc.TEST_MNEMONIC, index: number = 0): DerivedAccount {
    if (!validateMnemonic(mnemonic, wordlist)) {
      throw new Error("Invalid mnemonic")
    }

    const seed = mnemonicToSeedSync(mnemonic)
    const path = `m/44'/60'/0'/0/${index}`
    const root = HDKey.fromMasterSeed(seed)
    const child = root.derive(path)

    if (!child.privateKey) {
      throw new Error(`Derivation produced no private key at ${path}`)
    }

    const privateKey: Hex = bytesToHex(child.privateKey)
    const account = privateKeyToAccount(privateKey)

    return {
      address: account.address,
      privateKey,
      path
    }
  }

  public static run(): PocResult {
    try {
      const account = SepoliaDerivationPoc.derive()
      const passed = account.address.toLowerCase() === SepoliaDerivationPoc.EXPECTED_ADDRESS_0.toLowerCase()
      return {
        passed,
        derived: account.address,
        expected: SepoliaDerivationPoc.EXPECTED_ADDRESS_0,
        path: account.path
      }
    } catch (err) {
      return {
        passed: false,
        derived: "",
        expected: SepoliaDerivationPoc.EXPECTED_ADDRESS_0,
        path: "m/44'/60'/0'/0/0",
        error: err instanceof Error ? err.message : String(err)
      }
    }
  }
}

export default SepoliaDerivationPoc
export { type DerivedAccount, type PocResult }
