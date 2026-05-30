import { type JSX } from "react"
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import { useViewModel, useStream, useInit } from "react-native-mobile-mvvm"
import GasOracleViewModel, { type SelectedTier } from "../viewmodels/GasOracleViewModel"
import { Chain } from "../core/constants/chains.enum"
import { NetworkRegistry } from "../core/constants/networks"
import type { GasTier } from "../datasources/gas/gas-oracle.datasource"

const TIERS: ReadonlyArray<SelectedTier> = ["slow", "standard", "fast"]

function GasOracleScreen(): JSX.Element {
  const vm = useViewModel(GasOracleViewModel)
  const nav = useNavigation()
  const insets = useSafeAreaInsets()
  const chain = useStream(vm.chain$, vm.chain$.value)
  const state = useStream(vm.snapshot$, vm.snapshot$.value)
  const selected = useStream(vm.selectedTier$, vm.selectedTier$.value)

  useInit(() => {
    vm.startAutoRefresh()
  })

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => nav.goBack()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Gas Oracle</Text>
        <Pressable onPress={() => vm.refresh()}>
          <Text style={styles.refresh}>↻</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {vm.chains.map(c => (
            <Pressable
              key={c}
              style={[styles.chip, chain === c && styles.chipActive]}
              onPress={() => vm.setChain(c)}
            >
              <Text style={[styles.chipText, chain === c && styles.chipTextActive]}>
                {NetworkRegistry.get(c).symbol}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {state.status === "loading" && (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        )}

        {state.status === "error" && <Text style={styles.error}>{state.message}</Text>}

        {state.status === "success" && (
          <>
            <BaseFeeChart history={state.data.baseFeeHistory} />
            {TIERS.map(tier => {
              const data = state.data.tiers.find(t => t.label === tier)
              if (!data) return null
              return (
                <TierCard
                  key={tier}
                  data={data}
                  selected={selected === tier}
                  onSelect={() => vm.setSelectedTier(tier)}
                  chain={chain}
                />
              )
            })}
            <Text style={styles.meta}>
              {state.data.recentBlockCount} blocks · fetched{" "}
              {new Date(state.data.fetchedAtIso).toLocaleTimeString()}
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  )
}

function BaseFeeChart({ history }: { history: ReadonlyArray<bigint> }): JSX.Element {
  if (history.length === 0) return <View />
  const numbers = history.map(b => Number(b / 1_000_000n)) // wei → gwei ×1000 to keep precision
  const max = Math.max(...numbers, 1)
  return (
    <View style={styles.chart}>
      <Text style={styles.chartLabel}>Base fee (last {history.length} blocks)</Text>
      <View style={styles.chartBars}>
        {numbers.map((n, i) => (
          <View key={i} style={[styles.chartBar, { height: 4 + (n / max) * 60 }]} />
        ))}
      </View>
    </View>
  )
}

function TierCard({
  data,
  selected,
  onSelect,
  chain
}: {
  data: GasTier
  selected: boolean
  onSelect: () => void
  chain: Chain
}): JSX.Element {
  const cfg = NetworkRegistry.get(chain)
  return (
    <Pressable style={[styles.tier, selected && styles.tierSelected]} onPress={onSelect}>
      <View style={styles.tierHeader}>
        <Text style={styles.tierLabel}>{data.label.toUpperCase()}</Text>
        {selected && <Text style={styles.tierCheck}>✓</Text>}
      </View>
      <View style={styles.tierRow}>
        <Text style={styles.tierKey}>maxFeePerGas</Text>
        <Text style={styles.tierVal}>{toGwei(data.maxFeePerGas)} gwei</Text>
      </View>
      <View style={styles.tierRow}>
        <Text style={styles.tierKey}>priority</Text>
        <Text style={styles.tierVal}>{toGwei(data.maxPriorityFeePerGas)} gwei</Text>
      </View>
      <View style={styles.tierRow}>
        <Text style={styles.tierKey}>21k transfer</Text>
        <Text style={styles.tierVal}>
          {toEther(data.estimatedTransferWei)} {cfg.symbol}
        </Text>
      </View>
    </Pressable>
  )
}

function toGwei(wei: bigint): string {
  const gweiTimesThousand = wei / 1_000_000n
  const whole = gweiTimesThousand / 1000n
  const frac = (gweiTimesThousand % 1000n).toString().padStart(3, "0").replace(/0+$/, "")
  return frac.length === 0 ? whole.toString() : `${whole}.${frac}`
}

function toEther(wei: bigint): string {
  const microEth = wei / 1_000_000_000_000n
  const whole = microEth / 1_000_000n
  const frac = (microEth % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "")
  return frac.length === 0 ? whole.toString() : `${whole}.${frac}`
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  back: { color: "#007AFF", fontSize: 14 },
  refresh: { fontSize: 18 },
  title: { fontSize: 18, fontWeight: "700" },
  body: { padding: 16, gap: 12 },
  chipRow: { gap: 8, paddingBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: "#F2F2F7", borderRadius: 16 },
  chipActive: { backgroundColor: "#007AFF" },
  chipText: { fontSize: 12, color: "#1C1C1E", fontWeight: "500" },
  chipTextActive: { color: "#FFFFFF" },
  center: { padding: 32, alignItems: "center" },
  error: { color: "#B00020", padding: 12, textAlign: "center" },
  chart: { backgroundColor: "#F8F8FA", borderRadius: 12, padding: 12 },
  chartLabel: { fontSize: 12, fontWeight: "600", opacity: 0.6, marginBottom: 8 },
  chartBars: { flexDirection: "row", alignItems: "flex-end", gap: 4, height: 70 },
  chartBar: { flex: 1, backgroundColor: "#007AFF", borderRadius: 2 },
  tier: { backgroundColor: "#F8F8FA", borderRadius: 12, padding: 14, gap: 6 },
  tierSelected: { borderWidth: 2, borderColor: "#007AFF" },
  tierHeader: { flexDirection: "row", justifyContent: "space-between" },
  tierLabel: { fontSize: 13, fontWeight: "700" },
  tierCheck: { color: "#007AFF", fontSize: 16 },
  tierRow: { flexDirection: "row", justifyContent: "space-between" },
  tierKey: { fontSize: 12, opacity: 0.6 },
  tierVal: { fontSize: 12, fontFamily: "Courier" },
  meta: { fontSize: 11, opacity: 0.5, textAlign: "center", marginTop: 4 }
})

export default GasOracleScreen
