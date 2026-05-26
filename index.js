/**
 * @format
 * @author Wildan Frananda
 */

import "react-native-get-random-values"
import "text-encoding-polyfill"
import { install } from "react-native-quick-crypto"
install()
import { Buffer } from "buffer"
globalThis.Buffer = globalThis.Buffer ?? Buffer
import "reflect-metadata"

import { AppRegistry } from "react-native"
import App from "./App"
import { name as appName } from "./app.json"

AppRegistry.registerComponent(appName, () => App)
