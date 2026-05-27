import * as Keychain from "react-native-keychain"
import { Injectable } from "react-native-mobile-mvvm/di"

const SERVICE_NAME = "com.devwallet.mnemonic"
const USERNAME = "primary"

/**
 * Wraps react-native-keychain to persist the BIP39 mnemonic. Two storage
 * modes:
 *
 *  - `requireBiometric = true` → adds `BIOMETRY_ANY_OR_DEVICE_PASSCODE`
 *    access control. Reads trigger Face ID / Touch ID / device passcode.
 *  - `requireBiometric = false` → accessibility-only
 *    (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`). Reads succeed silently — the
 *    app-layer PIN gate enforces auth.
 *
 * Phase 1 stores the raw mnemonic; Phase 2 may swap to an encrypted blob
 * keyed by a session passphrase.
 */
@Injectable()
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

  /**
   * Re-store the mnemonic with a different `requireBiometric` flag. Used by
   * Settings when the user toggles the biometric switch — the mnemonic
   * blob doesn't change, only the keychain access-control attribute.
   */
  public async setBiometricRequired(requireBiometric: boolean, promptMessage?: string): Promise<void> {
    const mnemonic = await this.getMnemonic(promptMessage ?? "Authenticate to change security settings")
    if (mnemonic === null) {
      throw new Error("Cannot read mnemonic — biometric cancelled or not stored")
    }
    await this.setMnemonic(mnemonic, requireBiometric)
  }

  public async clear(): Promise<void> {
    await Keychain.resetGenericPassword({ service: SERVICE_NAME })
  }

  public async supportedBiometry(): Promise<Keychain.BIOMETRY_TYPE | null> {
    return Keychain.getSupportedBiometryType()
  }
}

export default KeychainService
