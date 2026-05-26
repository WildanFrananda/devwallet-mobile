import * as Keychain from "react-native-keychain"
import { injectable } from "tsyringe"

const SERVICE_NAME = "com.devwallet.mnemonic"
const USERNAME = "primary"

/**
 * Wraps react-native-keychain to persist the BIP39 mnemonic in the secure
 * enclave / keystore. Reads require biometric unlock (Face ID / Touch ID /
 * Android fingerprint). Phase 1 stores the raw mnemonic — Phase 2 may swap
 * to an encrypted blob keyed by a session passphrase.
 */
@injectable()
class KeychainService {
  public async hasMnemonic(): Promise<boolean> {
    const stored = await Keychain.getGenericPassword({ service: SERVICE_NAME })
    return stored !== false
  }

  public async setMnemonic(mnemonic: string, requireBiometric: boolean = true): Promise<void> {
    const options: Keychain.SetOptions = {
      service: SERVICE_NAME,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY
    }
    if (requireBiometric) {
      options.accessControl = Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE
    }
    const result = await Keychain.setGenericPassword(USERNAME, mnemonic, options)
    if (result === false) {
      throw new Error("Keychain.setGenericPassword returned false")
    }
  }

  public async getMnemonic(promptMessage: string = "Unlock wallet"): Promise<string | null> {
    const result = await Keychain.getGenericPassword({
      service: SERVICE_NAME,
      authenticationPrompt: { title: promptMessage }
    })
    if (result === false) return null
    return result.password
  }

  public async clear(): Promise<void> {
    await Keychain.resetGenericPassword({ service: SERVICE_NAME })
  }

  public async supportedBiometry(): Promise<Keychain.BIOMETRY_TYPE | null> {
    return Keychain.getSupportedBiometryType()
  }
}

export default KeychainService
