import * as Keychain from "react-native-keychain"
import { Injectable } from "react-native-mobile-mvvm/di"

const MNEMONIC_SERVICE = "com.devwallet.mnemonic"
const MNEMONIC_NEW_SERVICE = "com.devwallet.mnemonic.v2"
const PIN_CACHED_SERVICE = "com.devwallet.pin-cached"
const USERNAME = "primary"

/**
 * Wraps react-native-keychain to persist the BIP39 mnemonic and the
 * biometric-cached PIN row. Phase 3 stores the mnemonic as an encrypted
 * v2 JSON blob (SecureStorageService output) — Phase 1/2 raw plaintext is
 * still readable for migration via `getMnemonic()`.
 *
 * Two keychain access modes:
 *  - `requireBiometric = true` → adds `BIOMETRY_ANY_OR_DEVICE_PASSCODE`
 *    access control. Reads trigger Face ID / Touch ID / device passcode.
 *  - `requireBiometric = false` → accessibility-only
 *    (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`). Reads succeed silently — the
 *    app-layer PIN gate enforces auth.
 *
 * The PIN-cached row is always biometric-protected. It holds the literal
 * 6-digit PIN so the biometric unlock path can resolve the PIN, derive
 * the encryption key, and decrypt the mnemonic. The cached PIN never
 * leaves the device.
 */
@Injectable()
class KeychainService {
  public async hasMnemonic(): Promise<boolean> {
    const stored = await Keychain.getGenericPassword({ service: MNEMONIC_SERVICE })
    return stored !== false
  }

  public async setMnemonic(mnemonic: string, requireBiometric: boolean = true): Promise<void> {
    await this.writeRow(MNEMONIC_SERVICE, mnemonic, requireBiometric)
  }

  public async getMnemonic(promptMessage: string = "Unlock wallet"): Promise<string | null> {
    return this.readRow(MNEMONIC_SERVICE, promptMessage)
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

  /**
   * Temporary key used by the v0.3 migration to atomically swap the
   * encrypted mnemonic blob. See `MigrationService` for the full flow.
   */
  public async setMnemonicStaging(blob: string): Promise<void> {
    await this.writeRow(MNEMONIC_NEW_SERVICE, blob, false)
  }

  public async getMnemonicStaging(): Promise<string | null> {
    return this.readRow(MNEMONIC_NEW_SERVICE, "Migration check")
  }

  public async clearMnemonicStaging(): Promise<void> {
    await Keychain.resetGenericPassword({ service: MNEMONIC_NEW_SERVICE })
  }

  /** Biometric-protected row holding the literal PIN. */
  public async setCachedPin(pin: string): Promise<void> {
    await this.writeRow(PIN_CACHED_SERVICE, pin, true)
  }

  public async getCachedPin(promptMessage: string = "Use biometric to unlock"): Promise<string | null> {
    return this.readRow(PIN_CACHED_SERVICE, promptMessage)
  }

  public async clearCachedPin(): Promise<void> {
    await Keychain.resetGenericPassword({ service: PIN_CACHED_SERVICE })
  }

  public async hasCachedPin(): Promise<boolean> {
    const stored = await Keychain.getGenericPassword({ service: PIN_CACHED_SERVICE })
    return stored !== false
  }

  public async clear(): Promise<void> {
    await Keychain.resetGenericPassword({ service: MNEMONIC_SERVICE })
    await Keychain.resetGenericPassword({ service: MNEMONIC_NEW_SERVICE })
    await Keychain.resetGenericPassword({ service: PIN_CACHED_SERVICE })
  }

  public async supportedBiometry(): Promise<Keychain.BIOMETRY_TYPE | null> {
    return Keychain.getSupportedBiometryType()
  }

  private async writeRow(service: string, value: string, requireBiometric: boolean): Promise<void> {
    const options: Keychain.SetOptions = {
      service,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY
    }
    if (requireBiometric) {
      options.accessControl = Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE
    }
    const result = await Keychain.setGenericPassword(USERNAME, value, options)
    if (result === false) {
      throw new Error(`Keychain.setGenericPassword returned false for service=${service}`)
    }
  }

  private async readRow(service: string, promptMessage: string): Promise<string | null> {
    const result = await Keychain.getGenericPassword({
      service,
      authenticationPrompt: { title: promptMessage }
    })
    if (result === false) return null
    return result.password
  }
}

export default KeychainService
