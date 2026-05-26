/**
 * @format
 */

import "react-native-get-random-values"
import { install } from "react-native-quick-crypto"
install()
import "reflect-metadata"

import { AppRegistry } from "react-native"
import App from "./App"
import { name as appName } from "./app.json"

AppRegistry.registerComponent(appName, () => App)
