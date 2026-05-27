import { Injectable } from "react-native-mobile-mvvm/di"
import DeviceInfo from "react-native-device-info"
import { createMMKV } from "react-native-mmkv"

type MMKVHandle = ReturnType<typeof createMMKV>

const KEY_DEVICE_ID = "wallet.deviceId"

class DeviceMismatchError extends Error {
  public constructor() {
    super("Wallet is bound to another device. Restore from mnemonic to access this device.")
    this.name = "DeviceMismatchError"
  }
}

/**
 * Binds the wallet to a single device. On `bind()` the current device ID is
 * stored; on `verify()` the live device ID is compared. iOS uses
 * `identifierForVendor` (resets if all vendor apps uninstalled — combined
 * with the install marker this is fine). Android uses `Settings.Secure.ANDROID_ID`.
 */
@Injectable()
class DeviceBindingService {
  private cached: MMKVHandle | null = null

  public async bind(): Promise<void> {
    const id = await DeviceInfo.getUniqueId()
    this.storage().set(KEY_DEVICE_ID, id)
  }

  public async verify(): Promise<void> {
    const stored = this.storage().getString(KEY_DEVICE_ID)
    if (!stored) return
    const current = await DeviceInfo.getUniqueId()
    if (current !== stored) throw new DeviceMismatchError()
  }

  public clear(): void {
    this.storage().remove(KEY_DEVICE_ID)
  }

  private storage(): MMKVHandle {
    if (!this.cached) {
      this.cached = createMMKV({ id: "devwallet.device" })
    }
    return this.cached
  }
}

export default DeviceBindingService
export { DeviceMismatchError }
