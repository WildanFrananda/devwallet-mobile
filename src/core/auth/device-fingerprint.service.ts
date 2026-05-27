import { Injectable } from "react-native-mobile-mvvm/di"
import { createMMKV } from "react-native-mmkv"
import { Platform } from "react-native"

type MMKVHandle = ReturnType<typeof createMMKV>

const KEY_FINGERPRINT = "device.fingerprint"

/**
 * Stable per-install device fingerprint used by backend faucet rate-limit +
 * WebSocket auth + push token registration. Generated once at first boot
 * from a random 32-byte secret and stored in MMKV. Uninstall wipes the
 * MMKV scope so the next install gets a fresh fingerprint — backend treats
 * those as distinct devices, which is the correct behavior for our
 * rate-limit (no cross-install carry-over).
 *
 * NOT a stable hardware ID. If you need that, use react-native-device-info
 * separately — but PRD §F-02 rate-limit calls for a per-install identifier
 * to avoid leaking persistent device fingerprints to backend.
 */
@Injectable()
class DeviceFingerprintService {
  private cached: MMKVHandle | null = null
  private memo: string | null = null

  public get(): Promise<string> {
    if (this.memo) return Promise.resolve(this.memo)
    const existing = this.storage().getString(KEY_FINGERPRINT)
    if (existing) {
      this.memo = existing
      return Promise.resolve(existing)
    }
    const fingerprint = DeviceFingerprintService.randomHex(16)
    this.storage().set(KEY_FINGERPRINT, fingerprint)
    this.memo = fingerprint
    return Promise.resolve(fingerprint)
  }

  public platform(): "ios" | "android" {
    return Platform.OS === "ios" ? "ios" : "android"
  }

  private storage(): MMKVHandle {
    if (!this.cached) {
      this.cached = createMMKV({ id: "devwallet.device-fp" })
    }
    return this.cached
  }

  private static randomHex(bytes: number): string {
    const arr = new Uint8Array(bytes)
    crypto.getRandomValues(arr)
    let out = ""
    for (let i = 0; i < arr.length; i++) {
      const byte = arr[i] ?? 0
      out += byte.toString(16).padStart(2, "0")
    }
    return out
  }
}

export default DeviceFingerprintService
