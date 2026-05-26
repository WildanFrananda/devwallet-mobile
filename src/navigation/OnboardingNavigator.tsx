import { type JSX } from "react"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { ViewModelScope, useScopedViewModel, useEvent } from "react-native-mobile-mvvm"
import GenerateWalletScreen from "../screens/GenerateWalletScreen"
import VerifyMnemonicScreen from "../screens/VerifyMnemonicScreen"
import RestoreWalletScreen from "../screens/RestoreWalletScreen"
import OnboardingViewModel from "../viewmodels/OnboardingViewModel"

type OnboardingStackParamList = {
  GenerateWallet: undefined
  RestoreWallet: undefined
  VerifyMnemonic: undefined
}

type Props = {
  onComplete: () => void
}

const Stack = createNativeStackNavigator<OnboardingStackParamList>()

/**
 * Sits inside the ViewModelScope and bridges the scoped VM's `navigate$
 * "done"` event to the parent's onComplete callback so RootNavigator can
 * flip from Onboarding to the main App stack.
 */
function OnboardingBridge({ onComplete }: Props): null {
  const vm = useScopedViewModel(OnboardingViewModel)
  useEvent(vm.navigate$, event => {
    if (event === "done") onComplete()
  })
  return null
}

function OnboardingNavigator({ onComplete }: Props): JSX.Element {
  return (
    <ViewModelScope>
      <OnboardingBridge onComplete={onComplete} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="GenerateWallet" component={GenerateWalletScreen} />
        <Stack.Screen name="RestoreWallet" component={RestoreWalletScreen} />
        <Stack.Screen name="VerifyMnemonic" component={VerifyMnemonicScreen} />
      </Stack.Navigator>
    </ViewModelScope>
  )
}

export default OnboardingNavigator
