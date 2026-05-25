import { type JSX} from "react"
import { Text, View, StyleSheet } from "react-native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import GenerateWalletScreen from "../screens/GenerateWalletScreen"

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

function OnboardingNavigator(): JSX.Element {
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
