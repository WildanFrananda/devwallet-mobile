import { createMMKV } from "react-native-mmkv"

type MMKVHandle = ReturnType<typeof createMMKV>

/**
 * iOS Keychain entries survive app uninstall — without this guard a fresh
 * install would re-find the prior mnemonic and skip onboarding. MMKV is
 * sandboxed to the app container so it wipes on uninstall; we use its
 * presence/absence as the "is this a fresh install?" signal.
 *
 * Storage is created lazily so Jest (without the native module loaded)
 * can still import this file as part of dependency chains.
 */
class InstallMarker {
  private static readonly KEY = "devwallet.installed"
  private static cached: MMKVHandle | null = null

  private static storage(): MMKVHandle {
    if (!InstallMarker.cached) {
      InstallMarker.cached = createMMKV({ id: "devwallet.install" })
    }
    return InstallMarker.cached
  }

  public static isFreshInstall(): boolean {
    return !InstallMarker.storage().getBoolean(InstallMarker.KEY)
  }

  public static mark(): void {
    InstallMarker.storage().set(InstallMarker.KEY, true)
  }
}

export default InstallMarker
