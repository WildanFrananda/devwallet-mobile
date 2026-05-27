/**
 * @format
 * @author Wildan Frananda
 *
 * NOTE: uses require() instead of import on purpose. ESM imports are hoisted
 * so module side-effects (e.g. bitcoinjs / ecpair touching `Buffer` at init)
 * fire BEFORE top-level statements like `globalThis.Buffer = Buffer`. require()
 * runs strictly top-to-bottom so every polyfill is in place before any chain
 * lib loads.
 */

require("react-native-get-random-values")
require("text-encoding-polyfill")

const { Buffer } = require("buffer")
globalThis.Buffer = globalThis.Buffer ?? Buffer

const { install } = require("react-native-quick-crypto")
install()

require("reflect-metadata")

// Firebase background message handler MUST be registered before the app
// component is mounted, and at module scope so the headless JS runtime
// keeps it in scope when the OS wakes the app for a background push.
const messaging = require("@react-native-firebase/messaging").default
messaging().setBackgroundMessageHandler(remoteMessage => {
  // Backend NotificationService payloads carry `data.type` like
  // "faucet.success" / "faucet.failed". The OS already renders the
  // notification tray entry; we use this handler purely for any side
  // effect (e.g. analytics) that needs to run while the app is
  // backgrounded. Keep it lightweight.
  console.log("[push] background message", remoteMessage?.data?.type ?? "unknown")
  return Promise.resolve()
})

const { AppRegistry } = require("react-native")
const App = require("./App").default
const { name: appName } = require("./app.json")

AppRegistry.registerComponent(appName, () => App)
