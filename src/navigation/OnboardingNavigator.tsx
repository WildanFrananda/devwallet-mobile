import { type JSX } from "react"
import { createNativeStackNavigator, type NativeStackNavigationProp } from "@react-navigation/native-stack"
import { useNavigation } from "@react-navigation/native"
import { ViewModelScope, useScopedViewModel, useEvent } from "react-native-mobile-mvvm"
import WelcomeScreen from "../screens/WelcomeScreen"
import GenerateWalletScreen from "../screens/GenerateWalletScreen"
import VerifyMnemonicScreen from "../screens/VerifyMnemonicScreen"
import RestoreWalletScreen from "../screens/RestoreWalletScreen"
import PinSetupScreen from "../screens/PinSetupScreen"
import OnboardingViewModel from "../viewmodels/OnboardingViewModel"

type OnboardingStackParamList = {
  Welcome: undefined
  GenerateWallet: undefined
  RestoreWallet: undefined
  VerifyMnemonic: undefined
  CreatePin: undefined
}

type OnboardingNav = NativeStackNavigationProp<OnboardingStackParamList>

function WelcomeStep(): JSX.Element {
  const nav = useNavigation<OnboardingNav>()
  return (
    <WelcomeScreen
      onCreate={() => nav.navigate("GenerateWallet")}
      onRestore={() => nav.navigate("RestoreWallet")}
    />
  )
}

type Props = {
  onComplete: () => void
}

const Stack = createNativeStackNavigator<OnboardingStackParamList>()

function PinStep({ onDone }: { onDone: () => void }): JSX.Element {
  const vm = useScopedViewModel(OnboardingViewModel)
  return (
    <PinSetupScreen
      onDone={() => {
        vm.finishPinSetup()
        onDone()
      }}
    />
  )
}

/**
 * Listens to the final "done" event globally so the wrapping RootNavigator
 * can flip from Onboarding to the App stack regardless of which inner
 * screen emitted it.
 */
function CompletionBridge({ onComplete }: { onComplete: () => void }): null {
  const vm = useScopedViewModel(OnboardingViewModel)
  useEvent(vm.navigate$, event => {
    if (event === "done") onComplete()
  })
  return null
}

function OnboardingNavigator({ onComplete }: Props): JSX.Element {
  return (
    <ViewModelScope>
      <CompletionBridge onComplete={onComplete} />
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Welcome">
        <Stack.Screen name="Welcome" component={WelcomeStep} />
        <Stack.Screen name="GenerateWallet" component={GenerateWalletScreen} />
        <Stack.Screen name="RestoreWallet" component={RestoreWalletScreen} />
        <Stack.Screen name="VerifyMnemonic" component={VerifyMnemonicScreen} />
        <Stack.Screen name="CreatePin">{() => <PinStep onDone={onComplete} />}</Stack.Screen>
      </Stack.Navigator>
    </ViewModelScope>
  )
}

export default OnboardingNavigator
