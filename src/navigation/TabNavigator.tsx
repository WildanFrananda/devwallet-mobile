import { type JSX } from "react"
import { Text, View, StyleSheet } from "react-native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"

type TabParamList = {
  Wallet: undefined
  Faucet: undefined
  RpcInspector: undefined
  Webhook: undefined
}

const Tab = createBottomTabNavigator<TabParamList>()

function PlaceholderScreen({ label }: { label: string }): JSX.Element {
  return (
    <View style={styles.center}>
      <Text style={styles.text}>{label}</Text>
    </View>
  )
}

function TabNavigator(): JSX.Element {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Wallet">{() => <PlaceholderScreen label="Wallet" />}</Tab.Screen>
      <Tab.Screen name="Faucet">{() => <PlaceholderScreen label="Faucet" />}</Tab.Screen>
      <Tab.Screen name="RpcInspector">{() => <PlaceholderScreen label="RPC Inspector" />}</Tab.Screen>
      <Tab.Screen name="Webhook">{() => <PlaceholderScreen label="Webhook" />}</Tab.Screen>
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { fontSize: 18 }
})

export default TabNavigator
