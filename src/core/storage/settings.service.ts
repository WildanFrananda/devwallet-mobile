import { Injectable } from "react-native-mobile-mvvm/di"
import { createMMKV } from "react-native-mmkv"

type MMKVHandle = ReturnType<typeof createMMKV>

const KEY_AUTO_LOCK_MS = "settings.autoLockMs"
const KEY_USE_BIOMETRIC = "settings.useBiometric"

const DEFAULT_AUTO_LOCK_MS = 5 * 60 * 1000
const NEVER_LOCK_MS = -1

const AUTO_LOCK_CHOICES: ReadonlyArray<{ label: string; ms: number }> = [
  { label: "1 minute", ms: 60 * 1000 },
  { label: "5 minutes", ms: 5 * 60 * 1000 },
  { label: "15 minutes", ms: 15 * 60 * 1000 },
  { label: "30 minutes", ms: 30 * 60 * 1000 },
  { label: "Never", ms: NEVER_LOCK_MS }
]

/**
 * MMKV-backed user preferences. Non-secret only — anything sensitive belongs
 * in keychain. Storage is lazy so test code can mock `react-native-mmkv`
 * without import-time failures.
 */
@Injectable()
class SettingsService {
  private cached: MMKVHandle | null = null

  public getAutoLockMs(): number {
    const value = this.storage().getNumber(KEY_AUTO_LOCK_MS)
    return value === undefined ? DEFAULT_AUTO_LOCK_MS : value
  }

  public setAutoLockMs(ms: number): void {
    this.storage().set(KEY_AUTO_LOCK_MS, ms)
  }

  public getUseBiometric(): boolean {
    const value = this.storage().getBoolean(KEY_USE_BIOMETRIC)
    return value === undefined ? true : value
  }

  public setUseBiometric(enabled: boolean): void {
    this.storage().set(KEY_USE_BIOMETRIC, enabled)
  }

  private storage(): MMKVHandle {
    if (!this.cached) {
      this.cached = createMMKV({ id: "devwallet.settings" })
    }
    return this.cached
  }
}

export default SettingsService
export { AUTO_LOCK_CHOICES, DEFAULT_AUTO_LOCK_MS, NEVER_LOCK_MS }
