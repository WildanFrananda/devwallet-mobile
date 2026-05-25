import { type JSX, useState } from "react"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import AppNavigator from "./AppNavigator"
import OnboardingNavigator from "./OnboardingNavigator"

type RootStackParamList = {
  Onboarding: undefined
  App: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

function RootNavigator(): JSX.Element {
  // Phase 1 will replace this with a real keyring-presence check.
  const [hasWallet] = useState(false)

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {hasWallet ? (
        <Stack.Screen name="App" component={AppNavigator} />
      ) : (
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      )}
    </Stack.Navigator>
  )
}

export default RootNavigator
