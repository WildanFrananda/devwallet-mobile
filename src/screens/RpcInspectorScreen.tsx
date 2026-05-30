import { useMemo, useState, type JSX } from "react"
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ScrollView,
  Share
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useViewModel, useStream } from "react-native-mobile-mvvm"
import RpcInspectorViewModel, {
  type ChainFilter,
  type StatusFilter
} from "../viewmodels/RpcInspectorViewModel"
import { Chain } from "../core/constants/chains.enum"
import { NetworkRegistry } from "../core/constants/networks"
import type RpcLog from "../models/rpc-log.model"

const CHAIN_OPTIONS: ReadonlyArray<{ value: ChainFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: Chain.EVM_SEPOLIA, label: "Sepolia" },
  { value: Chain.EVM_POLYGON_AMOY, label: "Amoy" },
  { value: Chain.EVM_BASE_SEPOLIA, label: "Base" },
  { value: Chain.BITCOIN_TESTNET, label: "BTC" },
  { value: Chain.SOLANA_DEVNET, label: "SOL" },
  { value: Chain.COSMOS_THETA, label: "ATOM" },
  { value: Chain.XRPL_TESTNET, label: "XRP" },
  { value: Chain.STARKNET_SEPOLIA, label: "STRK" }
]

const STATUS_OPTIONS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "success", label: "OK" },
  { value: "error", label: "Err" }
]

function RpcInspectorScreen(): JSX.Element {
  const vm = useViewModel(RpcInspectorViewModel)
  const insets = useSafeAreaInsets()
  const logs = useStream(vm.filteredLogs$, vm.filteredLogs$.value)
  const count = useStream(vm.logCount$, vm.logCount$.value)
  const chainFilter = useStream(vm.chainFilter$, vm.chainFilter$.value)
  const statusFilter = useStream(vm.statusFilter$, vm.statusFilter$.value)
  const searchQuery = useStream(vm.searchQuery$, vm.searchQuery$.value)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function onExport(): Promise<void> {
    const json = vm.exportJson()
    try {
      await Share.share({
        message: json,
        title: `devwallet-rpc-logs-${new Date().toISOString()}.json`
      })
    } catch {
      // user dismissed share sheet — no-op
    }
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.headerBar}>
        <Text style={styles.title}>RPC Inspector</Text>
        <Text style={styles.subtitle}>
          {logs.length} / {count} entries
        </Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Filter method, endpoint, params…"
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoCorrect={false}
          value={searchQuery}
          onChangeText={vm.setSearchQuery.bind(vm)}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {CHAIN_OPTIONS.map(opt => (
          <Pressable
            key={opt.value}
            style={[styles.chip, chainFilter === opt.value && styles.chipActive]}
            onPress={() => vm.setChainFilter(opt.value)}
          >
            <Text style={[styles.chipText, chainFilter === opt.value && styles.chipTextActive]}>{opt.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {STATUS_OPTIONS.map(opt => (
          <Pressable
            key={opt.value}
            style={[styles.chip, statusFilter === opt.value && styles.chipActive]}
            onPress={() => vm.setStatusFilter(opt.value)}
          >
            <Text style={[styles.chipText, statusFilter === opt.value && styles.chipTextActive]}>{opt.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.actionRow}>
        <Pressable style={styles.actionBtn} onPress={() => void onExport()}>
          <Text style={styles.actionText}>Export JSON</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, styles.actionBtnDanger]} onPress={vm.clearLogs.bind(vm)}>
          <Text style={styles.actionTextDanger}>Clear</Text>
        </Pressable>
      </View>

      <FlatList
        data={logs}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <LogRow
            log={item}
            expanded={expandedId === item.id}
            onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No RPC calls yet. Open Wallet to fire requests.</Text>}
      />
    </View>
  )
}

function LogRow({ log, expanded, onToggle }: { log: RpcLog; expanded: boolean; onToggle: () => void }): JSX.Element {
  const chainLabel = useMemo(() => {
    try {
      return NetworkRegistry.get(log.chain).name
    } catch {
      return log.chain
    }
  }, [log.chain])
  return (
    <Pressable style={[styles.row, log.status === "error" && styles.rowError]} onPress={onToggle}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowMethod}>{log.method}</Text>
        <Text style={[styles.rowStatus, log.status === "error" ? styles.statusErr : styles.statusOk]}>
          {log.status === "error" ? "ERR" : "OK"} · {log.latencyMs}ms
        </Text>
      </View>
      <Text style={styles.rowMeta}>
        {chainLabel} · {log.timestamp.toLocaleTimeString()}
      </Text>
      {expanded && (
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Endpoint</Text>
          <Text style={styles.detailValue}>{log.endpoint}</Text>
          <Text style={styles.detailLabel}>Params</Text>
          <Text style={styles.detailValue}>{JSON.stringify(log.toJSON().params, null, 2)}</Text>
          {log.status === "success" ? (
            <>
              <Text style={styles.detailLabel}>Response</Text>
              <Text style={styles.detailValue}>{JSON.stringify(log.toJSON().response, null, 2)}</Text>
            </>
          ) : (
            <>
              <Text style={styles.detailLabel}>Error</Text>
              <Text style={[styles.detailValue, styles.statusErr]}>{log.errorMessage}</Text>
            </>
          )}
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12
  },
  title: { fontSize: 20, fontWeight: "700" },
  subtitle: { fontSize: 12, opacity: 0.6 },
  searchRow: { paddingHorizontal: 20, paddingBottom: 8 },
  search: {
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14
  },
  chipRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F2F2F7",
    borderRadius: 16
  },
  chipActive: { backgroundColor: "#007AFF" },
  chipText: { fontSize: 12, fontWeight: "500", color: "#1C1C1E" },
  chipTextActive: { color: "#FFFFFF" },
  actionRow: { flexDirection: "row", paddingHorizontal: 20, gap: 12, paddingBottom: 8 },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#007AFF",
    alignItems: "center"
  },
  actionBtnDanger: { backgroundColor: "#FFE5E5" },
  actionText: { color: "#FFFFFF", fontWeight: "600" },
  actionTextDanger: { color: "#B00020", fontWeight: "600" },
  list: { padding: 20, gap: 8 },
  row: { backgroundColor: "#F8F8FA", borderRadius: 10, padding: 12 },
  rowError: { borderLeftWidth: 3, borderLeftColor: "#B00020" },
  rowHeader: { flexDirection: "row", justifyContent: "space-between" },
  rowMethod: { fontSize: 14, fontWeight: "600", fontFamily: "Courier" },
  rowStatus: { fontSize: 11, fontWeight: "600" },
  statusOk: { color: "#34C759" },
  statusErr: { color: "#B00020" },
  rowMeta: { fontSize: 11, opacity: 0.6, marginTop: 2 },
  detail: { marginTop: 8, gap: 4 },
  detailLabel: { fontSize: 10, fontWeight: "700", opacity: 0.6, marginTop: 4 },
  detailValue: { fontSize: 12, fontFamily: "Courier" },
  empty: { textAlign: "center", opacity: 0.5, marginTop: 40 }
})

export default RpcInspectorScreen
