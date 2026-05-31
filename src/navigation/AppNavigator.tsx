import { type JSX } from "react"
import { createNativeStackNavigator, type NativeStackScreenProps } from "@react-navigation/native-stack"
import TabNavigator from "./TabNavigator"
import TxHistoryScreen from "../screens/TxHistoryScreen"
import TxDetailScreen from "../screens/TxDetailScreen"
import SendScreen from "../screens/SendScreen"
import ReceiveScreen from "../screens/ReceiveScreen"
import ChangePinScreen from "../screens/ChangePinScreen"
import ContractTerminalScreen from "../screens/ContractTerminalScreen"
import GasOracleScreen from "../screens/GasOracleScreen"
import TxReplayScreen from "../screens/TxReplayScreen"
import WebhookListScreen from "../screens/WebhookListScreen"
import WebhookCreateScreen from "../screens/WebhookCreateScreen"
import WebhookDetailScreen from "../screens/WebhookDetailScreen"
import NftGalleryScreen from "../screens/NftGalleryScreen"
import RpcInspectorScreen from "../screens/RpcInspectorScreen"
import type Transaction from "../models/transaction.model"
import type Webhook from "../models/webhook.model"
import { Chain } from "../core/constants/chains.enum"

type AppStackParamList = {
  Main: undefined
  TxHistory: { chain: Chain; address: string }
  TxDetail: { tx: Transaction; chain: Chain }
  Send: { chain: Chain; fromAddress: string }
  Receive: { chain: Chain; address: string }
  ChangePin: undefined
  ContractTerminal: undefined
  TxReplay: undefined
  GasOracle: undefined
  WebhookList: undefined
  WebhookCreate: undefined
  WebhookDetail: { webhook: Webhook }
  NftGallery: undefined
  RpcInspector: undefined
}

const Stack = createNativeStackNavigator<AppStackParamList>()

function AppNavigator(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="TxHistory" component={TxHistoryScreen} />
      <Stack.Screen name="TxDetail" component={TxDetailScreen} />
      <Stack.Screen name="Send" component={SendScreen} />
      <Stack.Screen name="Receive" component={ReceiveScreen} />
      <Stack.Screen name="ChangePin">
        {(props: NativeStackScreenProps<AppStackParamList, "ChangePin">) => {
          const back = (): void => props.navigation.goBack()
          return <ChangePinScreen onDone={back} onCancel={back} />
        }}
      </Stack.Screen>
      <Stack.Screen name="ContractTerminal" component={ContractTerminalScreen} />
      <Stack.Screen name="TxReplay" component={TxReplayScreen} />
      <Stack.Screen name="GasOracle" component={GasOracleScreen} />
      <Stack.Screen name="WebhookList" component={WebhookListScreen} />
      <Stack.Screen name="WebhookCreate" component={WebhookCreateScreen} />
      <Stack.Screen name="WebhookDetail" component={WebhookDetailScreen} />
      <Stack.Screen name="NftGallery" component={NftGalleryScreen} />
      <Stack.Screen name="RpcInspector" component={RpcInspectorScreen} />
    </Stack.Navigator>
  )
}

export default AppNavigator
export type { AppStackParamList }
