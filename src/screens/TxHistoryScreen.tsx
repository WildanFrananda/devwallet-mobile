import { type JSX } from "react"
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Button } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { useViewModel, useStream, useInit } from "react-native-mobile-mvvm"
import TxHistoryViewModel from "../viewmodels/TxHistoryViewModel"
import type Transaction from "../models/transaction.model"
import { Chain } from "../core/constants/chains.enum"
import { NetworkRegistry } from "../core/constants/networks"
import { truncateAddress, formatRelativeTime, formatNativeAmount } from "../utils/format"

type AppStackParamList = {
  Main: undefined
  TxHistory: { chain: Chain; address: string }
  TxDetail: { tx: Transaction; chain: Chain }
  Send: { chain: Chain; fromAddress: string }
  Receive: { chain: Chain; address: string }
}

type AppNav = NativeStackNavigationProp<AppStackParamList, "TxHistory">

function TxHistoryScreen(): JSX.Element {
  const vm = useViewModel(TxHistoryViewModel)
  const nav = useNavigation<AppNav>()
  const route = useRoute<RouteProp<AppStackParamList, "TxHistory">>()
  const { chain, address } = route.params
  const state = useStream(vm.state$, vm.state$.value)
  const items = useStream(vm.filteredItems$, vm.filteredItems$.value)
  const hasMore = useStream(vm.hasMore$, vm.hasMore$.value)
  const loadingMore = useStream(vm.loadingMore$, vm.loadingMore$.value)
  const filter = useStream(vm.filter$, vm.filter$.value)
  const cfg = NetworkRegistry.get(chain)

  useInit(() => vm.load(chain, address))

  const filters: ReadonlyArray<{ key: typeof filter; label: string }> = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "success", label: "Success" },
    { key: "failed", label: "Failed" }
  ]

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTextCol}>
            <Text style={styles.title}>Transactions</Text>
            <Text style={styles.subtitle}>
              {cfg.name} · {truncateAddress(address)}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Button title="Receive" onPress={() => nav.navigate("Receive", { chain, address })} />
            <Button
              testID="tx-history.send"
              title="Send"
              onPress={() => nav.navigate("Send", { chain, fromAddress: address })}
            />
          </View>
        </View>
      </View>

      {state.status === "loading" && (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      )}

      {state.status === "error" && (
        <View style={styles.center}>
          <Text style={styles.error}>{state.message}</Text>
        </View>
      )}

      {state.status === "success" && (
        <>
          <View style={styles.filterRow}>
            {filters.map(f => (
              <Pressable
                key={f.key}
                style={[styles.chip, filter === f.key && styles.chipActive]}
                onPress={() => vm.setFilter(f.key)}
              >
                <Text style={[styles.chipLabel, filter === f.key && styles.chipLabelActive]}>{f.label}</Text>
              </Pressable>
            ))}
          </View>
          <FlatList
            contentContainerStyle={styles.list}
            data={items}
            keyExtractor={tx => tx.hash}
            ListEmptyComponent={<Text style={styles.empty}>No transactions yet</Text>}
            ListFooterComponent={
              hasMore ? (
                <Pressable style={styles.loadMore} onPress={() => vm.loadMore()} disabled={loadingMore}>
                  {loadingMore ? <ActivityIndicator /> : <Text style={styles.loadMoreLabel}>Load more</Text>}
                </Pressable>
              ) : null
            }
            renderItem={({ item }) => {
              const outgoing = item.isOutgoingFor(address)
              return (
                <Pressable style={styles.row} onPress={() => nav.navigate("TxDetail", { tx: item, chain })}>
                  <View style={styles.rowLeft}>
                    <Text style={[styles.direction, outgoing ? styles.out : styles.in]}>
                      {outgoing ? "OUT" : "IN"}
                    </Text>
                    <Text style={styles.counterparty}>{truncateAddress(item.counterpartyFor(address))}</Text>
                    <Text style={styles.timestamp}>{formatRelativeTime(item.timestamp)}</Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={styles.amount}>
                      {outgoing ? "-" : "+"}
                      {formatNativeAmount(item.value, cfg.decimals, cfg.symbol)}
                    </Text>
                    <Text style={item.status === "failed" ? styles.failed : styles.statusOk}>{item.status}</Text>
                  </View>
                </Pressable>
              )
            }}
          />
        </>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  headerTextCol: { flex: 1 },
  headerActions: { flexDirection: "row", gap: 8 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 12, opacity: 0.6, marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: "#F2F2F7" },
  chipActive: { backgroundColor: "#007AFF" },
  chipLabel: { fontSize: 12, fontWeight: "500", color: "#333" },
  chipLabelActive: { color: "#FFFFFF" },
  loadMore: { padding: 12, alignItems: "center" },
  loadMoreLabel: { color: "#007AFF", fontWeight: "600" },
  list: { padding: 20, gap: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#F2F2F7",
    borderRadius: 8
  },
  rowLeft: { gap: 2 },
  rowRight: { alignItems: "flex-end", gap: 2 },
  direction: { fontSize: 10, fontWeight: "700" },
  out: { color: "#B00020" },
  in: { color: "#0A7" },
  counterparty: { fontFamily: "Courier", fontSize: 11 },
  timestamp: { fontSize: 10, opacity: 0.5 },
  amount: { fontSize: 13, fontWeight: "600", fontVariant: ["tabular-nums"] },
  statusOk: { fontSize: 10, color: "#0A7" },
  failed: { fontSize: 10, color: "#B00020" },
  error: { color: "#B00020", padding: 20, textAlign: "center" },
  empty: { textAlign: "center", opacity: 0.5, marginTop: 32 }
})

export default TxHistoryScreen
