import { type JSX } from "react"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import DashboardScreen from "../screens/DashboardScreen"
import SettingsScreen from "../screens/SettingsScreen"
import FaucetScreen from "../screens/FaucetScreen"
import ToolsScreen from "../screens/ToolsScreen"
import TabBar from "./TabBar"

type TabParamList = {
  Wallet: undefined
  Faucet: undefined
  Tools: undefined
  Settings: undefined
}

const Tab = createBottomTabNavigator<TabParamList>()

function TabNavigator(): JSX.Element {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={props => <TabBar {...props} />}>
      <Tab.Screen
        name="Wallet"
        component={DashboardScreen}
        options={{ tabBarButtonTestID: "nav.tab.wallet" }}
      />
      <Tab.Screen
        name="Faucet"
        component={FaucetScreen}
        options={{ tabBarButtonTestID: "nav.tab.faucet" }}
      />
      <Tab.Screen
        name="Tools"
        component={ToolsScreen}
        options={{ tabBarButtonTestID: "nav.tab.tools" }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarButtonTestID: "nav.tab.settings" }}
      />
    </Tab.Navigator>
  )
}

export default TabNavigator
