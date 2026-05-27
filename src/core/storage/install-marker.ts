import { createMMKV } from "react-native-mmkv"

/**
 * iOS Keychain entries survive app uninstall — without this guard a fresh
 * install would re-find the prior mnemonic and skip onboarding. MMKV is
 * sandboxed to the app container so it wipes on uninstall; we use its
 * presence/absence as the "is this a fresh install?" signal.
 */
class InstallMarker {
  private static readonly KEY = "devwallet.installed"
  private static readonly storage = createMMKV({ id: "devwallet.install" })

  public static isFreshInstall(): boolean {
    return !InstallMarker.storage.getBoolean(InstallMarker.KEY)
  }

  public static mark(): void {
    InstallMarker.storage.set(InstallMarker.KEY, true)
  }
}

export default InstallMarker
