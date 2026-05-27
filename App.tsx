import React from "react"
import { StatusBar, StyleSheet, useColorScheme } from "react-native"
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context"
import { NavigationContainer } from "@react-navigation/native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import DIContainer from "./src/core/di/container"
import RootNavigator from "./src/navigation/RootNavigator"
import { navigationRef } from "./src/navigation/navigation-ref"
import { wirePushTapHandlers } from "./src/core/notifications/push-tap.handler"

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
