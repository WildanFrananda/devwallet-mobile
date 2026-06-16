import { type JSX } from "react"
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { useViewModel, useStream, useInit } from "react-native-mobile-mvvm"
import TxHistoryViewModel from "../viewmodels/TxHistoryViewModel"
import type Transaction from "../models/transaction.model"
import { Chain } from "../core/constants/chains.enum"
import { NetworkRegistry } from "../core/constants/networks"
import { truncateAddress, formatRelativeTime, formatNativeAmount } from "../utils/format"
import DotGridBackground from "../components/DotGridBackground"
import { colors, typography, spacing, radius, hairline, chainColors, type ChainColorKey } from "../theme"

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
  const dot = chainColors[chain as ChainColorKey] ?? colors.border

  useInit(() => vm.load(chain, address))

  const filters: ReadonlyArray<{ key: typeof filter; label: string }> = [
    { key: "all", label: "ALL" },
    { key: "pending", label: "PENDING" },
    { key: "success", label: "SUCCESS" },
    { key: "failed", label: "FAILED" }
  ]

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]} testID="tx-history-screen">
      <DotGridBackground />

      <View style={styles.header}>
        <Text style={styles.eyebrow}>ACTIVITY</Text>
        <View style={styles.chainTag}>
          <View style={[styles.dot, { backgroundColor: dot }]} />
          <Text style={styles.chainName}>{cfg.name}</Text>
          <Text style={styles.chainAddr}>{truncateAddress(address)}</Text>
        </View>
        <View style={styles.actions}>
          <Pressable
            style={styles.actionBtn}
            onPress={() => nav.navigate("Send", { chain, fromAddress: address })}
            testID="tx-history.send"
          >
            <Text style={styles.actionPrimary}>↗ SEND</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => nav.navigate("Receive", { chain, address })}>
            <Text style={styles.actionLabel}>↙ RECEIVE</Text>
          </Pressable>
        </View>
      </View>

      {state.status === "loading" && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {state.status === "error" && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{state.message}</Text>
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
            ListEmptyComponent={<Text style={styles.empty}>NO TRANSACTIONS YET</Text>}
            ListFooterComponent={
              hasMore ? (
                <Pressable style={styles.loadMore} onPress={() => vm.loadMore()} disabled={loadingMore}>
                  {loadingMore ? (
                    <ActivityIndicator color={colors.accent} />
                  ) : (
                    <Text style={styles.loadMoreLabel}>LOAD MORE</Text>
                  )}
                </Pressable>
              ) : null
            }
            renderItem={({ item }) => {
              const outgoing = item.isOutgoingFor(address)
              return (
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  onPress={() => nav.navigate("TxDetail", { tx: item, chain })}
                >
                  <View style={styles.rowLeft}>
                    <View style={styles.dirRow}>
                      <Text style={[styles.direction, outgoing ? styles.out : styles.in]}>
                        {outgoing ? "OUT" : "IN"}
                      </Text>
                      <Text style={styles.counterparty}>{truncateAddress(item.counterpartyFor(address))}</Text>
                    </View>
                    <Text style={styles.timestamp}>{formatRelativeTime(item.timestamp)}</Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={styles.amount}>
                      {outgoing ? "−" : "+"}
                      {formatNativeAmount(item.value, cfg.decimals, cfg.symbol)}
                    </Text>
                    <Text style={item.status === "failed" ? styles.failed : styles.statusOk}>
                      {item.status.toUpperCase()}
                    </Text>
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
  safe: {
    flex: 1,
    backgroundColor: colors.background
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm
  },
  eyebrow: {
    ...typography.monoLabelSm,
    color: colors.textMuted
  },
  chainTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full
  },
  chainName: {
    ...typography.headlineMd,
    color: colors.textPrimary
  },
  chainAddr: {
    ...typography.monoLabelSm,
    color: colors.textMuted
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs
  },
  actionBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center"
  },
  actionPrimary: {
    ...typography.monoLabelSm,
    color: colors.accentText
  },
  actionLabel: {
    ...typography.monoLabelSm,
    color: colors.textSecondary
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: hairline,
    borderColor: colors.border,
    backgroundColor: colors.background
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceInteractive
  },
  chipLabel: {
    ...typography.monoLabelSm,
    color: colors.textMuted
  },
  chipLabelActive: {
    color: colors.accentText
  },
  loadMore: {
    paddingVertical: spacing.md,
    alignItems: "center"
  },
  loadMoreLabel: {
    ...typography.monoLabelSm,
    color: colors.accentText
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: hairline,
    borderColor: colors.border
  },
  rowPressed: {
    backgroundColor: colors.surfaceInteractive
  },
  rowLeft: {
    gap: spacing.xs
  },
  dirRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  rowRight: {
    alignItems: "flex-end",
    gap: spacing.xs
  },
  direction: {
    ...typography.monoLabelSm
  },
  out: {
    color: colors.warning
  },
  in: {
    color: colors.success
  },
  counterparty: {
    ...typography.monoDataSm,
    color: colors.textSecondary
  },
  timestamp: {
    ...typography.monoLabelSm,
    color: colors.textMuted
  },
  amount: {
    ...typography.monoDataMd,
    color: colors.textPrimary
  },
  statusOk: {
    ...typography.monoLabelSm,
    color: colors.success
  },
  failed: {
    ...typography.monoLabelSm,
    color: colors.error
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    textAlign: "center",
    paddingHorizontal: spacing.lg
  },
  empty: {
    ...typography.monoLabelSm,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xxl
  }
})

export default TxHistoryScreen
