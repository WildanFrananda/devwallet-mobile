import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import { Platform } from "react-native"
import messaging from "@react-native-firebase/messaging"
import Config from "react-native-config"
import DeviceFingerprintService from "../auth/device-fingerprint.service"
import { Tokens } from "../di/tokens"

/**
 * Registers the FCM token for the current device with the backend so the
 * Phase 2 NotificationService can fan out faucet success/failed pushes.
 *
 * iOS push delivery is gated on Apple Dev provisioning (see kickoff §4) —
 * even with the SDK installed, sends silently no-op until APNs key is
 * uploaded to Firebase. Token registration itself still works on iOS.
 */
@Injectable()
class PushService {
  public constructor(
    @Inject(Tokens.DeviceFingerprint) private readonly fingerprint: DeviceFingerprintService
  ) {}

  /**
   * Idempotent: call on every app boot. Requests notification permission
   * (no-op on Android <13), fetches the FCM token, and POSTs it to the
   * backend keyed by the device fingerprint.
   *
   * Never throws on failure — push is non-essential.
   */
  public async registerWithBackend(): Promise<void> {
    try {
      const authorized = await this.ensureAuthorized()
      if (!authorized) return
      const token = await messaging().getToken()
      if (!token) return
      const fp = await this.fingerprint.get()
      await this.sendToBackend({
        fingerprint: fp,
        platform: this.fingerprint.platform(),
        pushToken: token
      })
    } catch (err) {
      // Swallow — push is best-effort.
      console.warn("[push] register failed", err instanceof Error ? err.message : err)
    }
  }

  /** Subscribe to token refresh; backend gets updated when FCM rotates it. */
  public subscribeTokenRefresh(): () => void {
    return messaging().onTokenRefresh(token => {
      void this.fingerprint.get().then(fp =>
        this.sendToBackend({ fingerprint: fp, platform: this.fingerprint.platform(), pushToken: token })
      )
    })
  }

  private async ensureAuthorized(): Promise<boolean> {
    // E2E builds: never raise the OS notification permission dialog — it would
    // overlay the screen and block Detox. iOS pre-grants via launchApp
    // permissions; Android (no launchApp permission support) relies on this
    // short-circuit. Push is non-essential, so treating it as authorized is safe.
    if (Config.E2E_MOCK === "1") return true
    if (Platform.OS === "android") {
      // Android requires runtime permission only on SDK 33+. RN Firebase
      // handles the prompt via requestPermission too.
      const status = await messaging().requestPermission()
      return PushService.statusAuthorized(status)
    }
    const status = await messaging().requestPermission({ provisional: false })
    return PushService.statusAuthorized(status)
  }

  private async sendToBackend(body: {
    fingerprint: string
    platform: "ios" | "android"
    pushToken: string
  }): Promise<void> {
    const base = Config.API_BASE_URL
    if (!base) return
    await fetch(`${base}/devices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
  }

  private static statusAuthorized(status: number): boolean {
    // FirebaseMessagingTypes.AuthorizationStatus: AUTHORIZED=1, PROVISIONAL=2, EPHEMERAL=4
    return status === 1 || status === 2 || status === 4
  }
}

export default PushService
