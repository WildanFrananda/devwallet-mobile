import { type JSX } from "react"
import { Text, View, StyleSheet } from "react-native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import TabNavigator from "./TabNavigator"

type AppStackParamList = {
  Main: undefined
  ContractTerminal: undefined
  TxReplay: undefined
  GasOracle: undefined
}

const Stack = createNativeStackNavigator<AppStackParamList>()

function PlaceholderScreen({ label }: { label: string }): JSX.Element {
  return (
    <View style={styles.center}>
      <Text style={styles.text}>{label}</Text>
    </View>
  )
}

function AppNavigator(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="ContractTerminal">{() => <PlaceholderScreen label="Contract Terminal" />}</Stack.Screen>
      <Stack.Screen name="TxReplay">{() => <PlaceholderScreen label="Tx Replay" />}</Stack.Screen>
      <Stack.Screen name="GasOracle">{() => <PlaceholderScreen label="Gas Oracle" />}</Stack.Screen>
    </Stack.Navigator>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { fontSize: 18 }
})

export default AppNavigator
