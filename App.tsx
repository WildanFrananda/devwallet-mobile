import "reflect-metadata"
import React from "react"
import { StatusBar, StyleSheet, useColorScheme } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { NavigationContainer } from "@react-navigation/native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { configureDI } from "./src/core/di/container"
import RootNavigator from "./src/navigation/RootNavigator"

configureDI()

function App() {
  const isDarkMode = useColorScheme() === "dark"

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <NavigationContainer>
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
