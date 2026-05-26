import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from "@scure/bip39"
import { wordlist } from "@scure/bip39/wordlists/english.js"

type MnemonicStrength = 128 | 160 | 192 | 224 | 256

class Bip39 {
  public static generate(strength: MnemonicStrength = 128): string {
    return generateMnemonic(wordlist, strength)
  }

  public static validate(mnemonic: string): boolean {
    return validateMnemonic(mnemonic, wordlist)
  }

  public static toSeed(mnemonic: string, passphrase: string = ""): Uint8Array {
    if (!Bip39.validate(mnemonic)) {
      throw new Error("Invalid mnemonic")
    }
    return mnemonicToSeedSync(mnemonic, passphrase)
  }
}

export default Bip39
export { type MnemonicStrength }
