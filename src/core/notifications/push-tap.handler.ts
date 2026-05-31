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
  if (!navigationRef.isReady()) return
  // Within the App tab navigator, target tabs are mounted under the
  // "Main" stack entry. Nested navigation per React Navigation 7 spec.
  if (type === "faucet.success" || type === "faucet.failed") {
    navigationRef.navigate("Main", { screen: "Faucet" })
    return
  }
  // Phase 4: webhook fired → push the Webhooks list onto the AppStack
  // (post-nav-refactor, WebhookList is an AppStack route reached from
  // the Tools tab). Detail screen needs the full Webhook object, so we
  // land on the list and let the user tap into the most-recent row.
  if (type === "webhook.event") {
    navigationRef.navigate("WebhookList")
  }
}

export { wirePushTapHandlers }
