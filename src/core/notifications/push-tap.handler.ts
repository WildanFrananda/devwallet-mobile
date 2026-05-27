import messaging, { type FirebaseMessagingTypes } from "@react-native-firebase/messaging"
import { navigationRef } from "../../navigation/navigation-ref"

type RemoteMessage = FirebaseMessagingTypes.RemoteMessage

/**
 * Wires both notification tap entry points:
 *   1. `getInitialNotification` — cold launch from a terminated state.
 *   2. `onNotificationOpenedApp` — tap when app is backgrounded.
 *
 * Routes `faucet.success` / `faucet.failed` data payloads to the Faucet
 * tab. Safe to call repeatedly — only the most recent subscription wins
 * for `onNotificationOpenedApp`.
 *
 * Returns an unsubscribe function for the live listener.
 */
function wirePushTapHandlers(): () => void {
  void messaging()
    .getInitialNotification()
    .then(message => {
      if (message) handleTap(message)
    })

  return messaging().onNotificationOpenedApp(handleTap)
}

function handleTap(message: RemoteMessage): void {
  const type = typeof message.data?.type === "string" ? message.data.type : null
  if (type !== "faucet.success" && type !== "faucet.failed") return
  if (!navigationRef.isReady()) return
  // Within the App tab navigator, the Faucet tab is mounted under the
  // "Main" stack entry. Nested navigation per React Navigation 7 spec.
  navigationRef.navigate("Main", { screen: "Faucet" })
}

export { wirePushTapHandlers }
