import { type JSX } from "react"
import { Text, View, StyleSheet } from "react-native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import DashboardScreen from "../screens/DashboardScreen"
import SettingsScreen from "../screens/SettingsScreen"
import FaucetScreen from "../screens/FaucetScreen"
import RpcInspectorScreen from "../screens/RpcInspectorScreen"

type TabParamList = {
  Wallet: undefined
  Faucet: undefined
  RpcInspector: undefined
  Webhook: undefined
  Settings: undefined
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
      <Tab.Screen name="Wallet" component={DashboardScreen} />
      <Tab.Screen name="Faucet" component={FaucetScreen} />
      <Tab.Screen name="RpcInspector" component={RpcInspectorScreen} options={{ title: "RPC" }} />
      <Tab.Screen name="Webhook">{() => <PlaceholderScreen label="Webhook" />}</Tab.Screen>
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { fontSize: 18 }
})

export default TabNavigator
