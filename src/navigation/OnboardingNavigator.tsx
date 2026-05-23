import React from "react"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { View, Text, StyleSheet } from "react-native"
import GenerateWalletScreen from "../screens/GenerateWalletScreen"

export type OnboardingStackParamList = {
  GenerateWallet: undefined
  RestoreWallet: undefined
  VerifyMnemonic: undefined
}

const Stack = createNativeStackNavigator<OnboardingStackParamList>()

function PlaceholderScreen({ label }: { label: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.text}>{label}</Text>
    </View>
  )
}

function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GenerateWallet" component={GenerateWalletScreen} />
      <Stack.Screen name="RestoreWallet">{() => <PlaceholderScreen label="Restore Wallet" />}</Stack.Screen>
      <Stack.Screen name="VerifyMnemonic">{() => <PlaceholderScreen label="Verify Mnemonic" />}</Stack.Screen>
    </Stack.Navigator>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { fontSize: 18 }
})

export default OnboardingNavigator
