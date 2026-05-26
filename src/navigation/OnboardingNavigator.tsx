import { type JSX } from "react"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { ViewModelScope } from "react-native-mobile-mvvm"
import GenerateWalletScreen from "../screens/GenerateWalletScreen"
import VerifyMnemonicScreen from "../screens/VerifyMnemonicScreen"
import RestoreWalletScreen from "../screens/RestoreWalletScreen"

type OnboardingStackParamList = {
  GenerateWallet: undefined
  RestoreWallet: undefined
  VerifyMnemonic: undefined
}

const Stack = createNativeStackNavigator<OnboardingStackParamList>()

/**
 * ViewModelScope makes `useScopedViewModel(OnboardingViewModel)` resolve the
 * same instance across Generate + Verify + Restore so the mnemonic draft /
 * verification challenge / persist state live for the whole onboarding flow.
 * Cleared automatically when this navigator unmounts.
 */
function OnboardingNavigator(): JSX.Element {
  return (
    <ViewModelScope>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="GenerateWallet" component={GenerateWalletScreen} />
        <Stack.Screen name="RestoreWallet" component={RestoreWalletScreen} />
        <Stack.Screen name="VerifyMnemonic" component={VerifyMnemonicScreen} />
      </Stack.Navigator>
    </ViewModelScope>
  )
}

export default OnboardingNavigator
