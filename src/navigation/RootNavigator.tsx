import { type JSX } from "react"
import { ActivityIndicator, View, StyleSheet, Text } from "react-native"
import { useViewModel, useStream, useInit } from "react-native-mobile-mvvm"
import RootViewModel from "../viewmodels/RootViewModel"
import OnboardingNavigator from "./OnboardingNavigator"
import AppNavigator from "./AppNavigator"
import UnlockScreen from "../screens/UnlockScreen"
import MigrateScreen from "../screens/MigrateScreen"

function RootNavigator(): JSX.Element {
  const vm = useViewModel(RootViewModel)
  const route = useStream(vm.route$, vm.route$.value)

  useInit(() => vm.bootstrap())

  if (route.status === "loading" || route.status === "idle") {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    )
  }

  if (route.status === "error") {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{route.message}</Text>
      </View>
    )
  }

  switch (route.data) {
    case "onboarding":
      return <OnboardingNavigator onComplete={() => vm.enterApp()} />
    case "unlock":
      return <UnlockScreen onUnlocked={() => vm.enterApp()} />
    case "migrate":
      return <MigrateScreen onSubmit={pin => vm.runMigration(pin)} />
    case "app":
      return <AppNavigator />
  }
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  error: { color: "#B00020", fontSize: 14, textAlign: "center" }
})

export default RootNavigator
