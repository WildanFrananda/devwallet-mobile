import { type JSX } from "react"
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRoute, type RouteProp } from "@react-navigation/native"
import type Transaction from "../models/transaction.model"
import { Chain } from "../core/constants/chains.enum"
import { NetworkRegistry } from "../core/constants/networks"
import { formatNativeAmount } from "../utils/format"

type AppStackParamList = {
  Main: undefined
  TxHistory: { chain: Chain; address: string }
  TxDetail: { tx: Transaction; chain: Chain }
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }): JSX.Element {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={mono ? styles.mono : styles.value} selectable>
        {value}
      </Text>
    </View>
  )
}

function TxDetailScreen(): JSX.Element {
  const route = useRoute<RouteProp<AppStackParamList, "TxDetail">>()
  const { tx, chain } = route.params
  const cfg = NetworkRegistry.get(chain)

  const explorerUrl = cfg.explorerUrl ? `${cfg.explorerUrl}/tx/${tx.hash}` : null

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Transaction</Text>
        <Text style={[styles.statusPill, tx.status === "failed" ? styles.failed : styles.success]}>{tx.status}</Text>

        <Field label="Hash" value={tx.hash} mono />
        <Field label="From" value={tx.from} mono />
        <Field label="To" value={tx.to} mono />
        <Field label="Value" value={formatNativeAmount(tx.value, cfg.decimals, cfg.symbol, 8)} />
        {tx.fee !== null && <Field label="Fee" value={formatNativeAmount(tx.fee, cfg.decimals, cfg.symbol, 8)} />}
        {tx.blockNumber !== null && <Field label="Block" value={`#${tx.blockNumber}`} />}
        {tx.timestamp !== null && <Field label="Timestamp" value={tx.timestamp.toISOString()} />}

        {explorerUrl !== null && (
          <Pressable style={styles.explorerBtn} onPress={() => void Linking.openURL(explorerUrl)}>
            <Text style={styles.explorerBtnText}>Open in explorer ↗</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: "700" },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    fontSize: 11,
    fontWeight: "700",
    overflow: "hidden",
    color: "#fff"
  },
  success: { backgroundColor: "#0A7" },
  failed: { backgroundColor: "#B00020" },
  field: { gap: 2 },
  label: { fontSize: 11, opacity: 0.6, fontWeight: "600" },
  value: { fontSize: 14 },
  mono: { fontFamily: "Courier", fontSize: 12 },
  explorerBtn: {
    marginTop: 16,
    padding: 14,
    backgroundColor: "#EEF6FB",
    borderRadius: 8,
    alignItems: "center"
  },
  explorerBtnText: { fontSize: 14, fontWeight: "600", color: "#0066CC" }
})

export default TxDetailScreen
