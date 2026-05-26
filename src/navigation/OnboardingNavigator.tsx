import { type JSX } from "react"
import { Text, View, StyleSheet } from "react-native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { ViewModelScope } from "react-native-mobile-mvvm"
import GenerateWalletScreen from "../screens/GenerateWalletScreen"
import VerifyMnemonicScreen from "../screens/VerifyMnemonicScreen"

type OnboardingStackParamList = {
  GenerateWallet: undefined
  RestoreWallet: undefined
  VerifyMnemonic: undefined
}

const Stack = createNativeStackNavigator<OnboardingStackParamList>()

function PlaceholderScreen({ label }: { label: string }): JSX.Element {
  return (
    <View style={styles.center}>
      <Text style={styles.text}>{label}</Text>
    </View>
  )
}

/**
 * ViewModelScope makes `useScopedViewModel(OnboardingViewModel)` resolve the
 * same instance across GenerateWalletScreen + VerifyMnemonicScreen so the
 * mnemonic draft + verification challenge live for the whole onboarding flow.
 * Cleared automatically when this navigator unmounts.
 */
function OnboardingNavigator(): JSX.Element {
  return (
    <ViewModelScope>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="GenerateWallet" component={GenerateWalletScreen} />
        <Stack.Screen name="RestoreWallet">{() => <PlaceholderScreen label="Restore Wallet" />}</Stack.Screen>
        <Stack.Screen name="VerifyMnemonic" component={VerifyMnemonicScreen} />
      </Stack.Navigator>
    </ViewModelScope>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { fontSize: 18 }
})

export default OnboardingNavigator
