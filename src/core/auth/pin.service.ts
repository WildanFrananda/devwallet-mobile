import { Injectable } from "react-native-mobile-mvvm/di"
import { pbkdf2Sync, randomBytes } from "react-native-quick-crypto"
import * as Keychain from "react-native-keychain"
import { createMMKV } from "react-native-mmkv"

type MMKVHandle = ReturnType<typeof createMMKV>

const PIN_SERVICE = "com.devwallet.pin"
const PIN_USERNAME = "primary"
const ITERATIONS = 100_000
const KEY_LEN = 32
const SALT_LEN = 32

const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 60 * 1000
const KEY_ATTEMPTS = "pin.attempts"
const KEY_LOCKOUT_UNTIL = "pin.lockoutUntil"

type StoredPin = { saltHex: string; hashHex: string }

/**
 * PIN auth as a biometric fallback. Hash is PBKDF2-SHA256 (100k iter,
 * 32-byte salt). Hash + salt live in keychain — never written to MMKV.
 * Failed-attempt counter + lockout timestamp live in MMKV (non-secret).
 *
 * PIN never gates the mnemonic at the keychain layer — it gates whether
 * the repository calls `keychain.getMnemonic()`. Mnemonic access still
 * requires the device passcode tier (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`).
 */
@Injectable()
class PinService {
  private mmkvCached: MMKVHandle | null = null

  public async hasPin(): Promise<boolean> {
    const stored = await Keychain.getGenericPassword({ service: PIN_SERVICE })
    return stored !== false
  }

  public async setPin(pin: string): Promise<void> {
    if (!PinService.isValidFormat(pin)) {
      throw new Error("PIN must be exactly 6 digits")
    }
    const saltBytes = randomBytes(SALT_LEN)
    const hashBytes = pbkdf2Sync(pin, saltBytes, ITERATIONS, KEY_LEN, "sha256")
    const payload: StoredPin = {
      saltHex: PinService.toHex(saltBytes),
      hashHex: PinService.toHex(hashBytes)
    }
    const result = await Keychain.setGenericPassword(PIN_USERNAME, JSON.stringify(payload), {
      service: PIN_SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY
    })
    if (result === false) {
      throw new Error("Keychain.setGenericPassword (pin) returned false")
    }
    this.resetAttempts()
  }

  public async verifyPin(pin: string): Promise<boolean> {
    if (!PinService.isValidFormat(pin)) return false
    if (this.isLockedOut()) {
      throw new Error("PIN entry locked. Try again later.")
    }
    const stored = await Keychain.getGenericPassword({ service: PIN_SERVICE })
    if (stored === false) return false
    const parsed = JSON.parse(stored.password) as StoredPin
    const saltBytes = PinService.fromHex(parsed.saltHex)
    const hashBytes = pbkdf2Sync(pin, saltBytes, ITERATIONS, KEY_LEN, "sha256")
    const expectedHex = PinService.toHex(hashBytes)
    const match = PinService.constantTimeEqHex(expectedHex, parsed.hashHex)
    if (match) {
      this.resetAttempts()
      return true
    }
    this.bumpAttempts()
    return false
  }

  public async changePin(oldPin: string, newPin: string): Promise<void> {
    const ok = await this.verifyPin(oldPin)
    if (!ok) throw new Error("Current PIN does not match")
    await this.setPin(newPin)
  }

  public async clearPin(): Promise<void> {
    await Keychain.resetGenericPassword({ service: PIN_SERVICE })
    this.resetAttempts()
  }

  public getRemainingAttempts(): number {
    const used = this.storage().getNumber(KEY_ATTEMPTS) ?? 0
    return Math.max(MAX_ATTEMPTS - used, 0)
  }

  public getLockoutMsRemaining(): number {
    const until = this.storage().getNumber(KEY_LOCKOUT_UNTIL) ?? 0
    return Math.max(until - Date.now(), 0)
  }

  public isLockedOut(): boolean {
    return this.getLockoutMsRemaining() > 0
  }

  private bumpAttempts(): void {
    const used = (this.storage().getNumber(KEY_ATTEMPTS) ?? 0) + 1
    this.storage().set(KEY_ATTEMPTS, used)
    if (used >= MAX_ATTEMPTS) {
      this.storage().set(KEY_LOCKOUT_UNTIL, Date.now() + LOCKOUT_MS)
      this.storage().set(KEY_ATTEMPTS, 0)
    }
  }

  private resetAttempts(): void {
    this.storage().set(KEY_ATTEMPTS, 0)
    this.storage().set(KEY_LOCKOUT_UNTIL, 0)
  }

  private storage(): MMKVHandle {
    if (!this.mmkvCached) {
      this.mmkvCached = createMMKV({ id: "devwallet.pin" })
    }
    return this.mmkvCached
  }

  private static isValidFormat(pin: string): boolean {
    return /^\d{6}$/.test(pin)
  }

  private static toHex(bytes: Uint8Array | Buffer): string {
    let out = ""
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i] ?? 0
      out += byte.toString(16).padStart(2, "0")
    }
    return out
  }

  private static fromHex(hex: string): Uint8Array {
    const out = new Uint8Array(hex.length / 2)
    for (let i = 0; i < out.length; i++) {
      out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
    }
    return out
  }

  private static constantTimeEqHex(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    let diff = 0
    for (let i = 0; i < a.length; i++) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    return diff === 0
  }
}

export default PinService
export { MAX_ATTEMPTS, LOCKOUT_MS }
