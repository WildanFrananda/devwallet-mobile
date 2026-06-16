import React from "react"
import { LogBox, StatusBar, StyleSheet, useColorScheme } from "react-native"
import Config from "react-native-config"
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context"
import { NavigationContainer } from "@react-navigation/native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import DIContainer from "./src/core/di/container"
import RootNavigator from "./src/navigation/RootNavigator"
import { navigationRef } from "./src/navigation/navigation-ref"
import { wirePushTapHandlers } from "./src/core/notifications/push-tap.handler"

// E2E builds only: the dev LogBox warning toast renders a bar at the bottom of
// the screen that overlaps the bottom tab bar, making tab buttons fail Detox's
// 100% visibility check. Suppress it so Detox can tap tabs reliably. Normal dev
// builds keep LogBox on.
if (Config.E2E_MOCK === "1") LogBox.ignoreAllLogs(true)

DIContainer.configure()

function App() {
  const isDarkMode = useColorScheme() === "dark"

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <NavigationContainer ref={navigationRef} onReady={() => wirePushTapHandlers()}>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 }
})

export default App
