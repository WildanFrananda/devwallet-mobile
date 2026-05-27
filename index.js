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

const { AppRegistry } = require("react-native")
const App = require("./App").default
const { name: appName } = require("./app.json")

AppRegistry.registerComponent(appName, () => App)
