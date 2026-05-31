import { type JSX } from "react"
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { AppStackParamList } from "../navigation/AppNavigator"

type AppNav = NativeStackNavigationProp<AppStackParamList>

type ToolEntry = {
  label: string
  description: string
  to: keyof AppStackParamList
}

const TOOLS: ReadonlyArray<ToolEntry> = [
  {
    label: "RPC Inspector",
    description: "Live log of every chain RPC call. Filter, replay, mock.",
    to: "RpcInspector"
  },
  {
    label: "Contract Terminal",
    description: "Paste EVM / Anchor / Cairo ABI. Auto-form read & write.",
    to: "ContractTerminal"
  },
  {
    label: "Gas Oracle",
    description: "3-tier fee estimate + 24h history + custom limit.",
    to: "GasOracle"
  },
  {
    label: "TX Replay",
    description: "Decode mainnet tx → re-broadcast on testnet.",
    to: "TxReplay"
  },
  {
    label: "Webhooks",
    description: "Subscribe to contract events → push notifications.",
    to: "WebhookList"
  },
  {
    label: "NFT Gallery",
    description: "Browse testnet NFTs across EVM + Solana.",
    to: "NftGallery"
  }
]

function ToolsScreen(): JSX.Element {
  const nav = useNavigation<AppNav>()
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.headerBar}>
        <Text style={styles.title}>Tools</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {TOOLS.map(tool => (
          <Pressable
            key={tool.to}
            style={styles.row}
            onPress={() => nav.navigate(tool.to as never)}
          >
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{tool.label}</Text>
              <Text style={styles.rowDescription}>{tool.description}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F8FA" },
  headerBar: { paddingHorizontal: 20, paddingVertical: 12 },
  title: { fontSize: 24, fontWeight: "700" },
  list: { padding: 16, gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    gap: 12
  },
  rowText: { flex: 1, gap: 4 },
  rowLabel: { fontSize: 15, fontWeight: "600" },
  rowDescription: { fontSize: 12, opacity: 0.6 },
  chevron: { fontSize: 22, opacity: 0.35 }
})

export default ToolsScreen
