import { type JSX } from "react"
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import { useViewModel, useStream, useInit } from "react-native-mobile-mvvm"
import Svg, { Polyline, Line, Rect } from "react-native-svg"
import GasOracleViewModel, { type SelectedTier } from "../viewmodels/GasOracleViewModel"
import { Chain } from "../core/constants/chains.enum"
import { NetworkRegistry } from "../core/constants/networks"
import { PriceRegistry } from "../core/constants/prices"
import type { GasTier } from "../datasources/gas/gas-oracle.datasource"
import type { GasSample } from "../repositories/gas-history.repository"

const TIERS: ReadonlyArray<SelectedTier> = ["slow", "standard", "fast"]

function GasOracleScreen(): JSX.Element {
  const vm = useViewModel(GasOracleViewModel)
  const nav = useNavigation()
  const insets = useSafeAreaInsets()
  const chain = useStream(vm.chain$, vm.chain$.value)
  const state = useStream(vm.snapshot$, vm.snapshot$.value)
  const selected = useStream(vm.selectedTier$, vm.selectedTier$.value)
  const gasLimit = useStream(vm.gasLimit$, vm.gasLimit$.value)
  const history = useStream(vm.history$, vm.history$.value)
  const totalUsd = useStream(vm.totalCostUsd$, vm.totalCostUsd$.value)

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
            {state.data.fallback && (
              <Text style={styles.fallbackNote}>
                feeHistory empty — synthetic ±20% tiers from eth_gasPrice
              </Text>
            )}
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
            <GasLimitPicker
              presets={vm.gasLimitPresets}
              current={gasLimit}
              onPick={limit => vm.setGasLimit(limit)}
            />
            <UsdCostCard
              gasLimit={gasLimit}
              usd={totalUsd}
              tier={state.data.tiers.find(t => t.label === selected) ?? null}
              chain={chain}
            />
            <HistoryChart samples={history} chain={chain} />
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

function GasLimitPicker({
  presets,
  current,
  onPick
}: {
  presets: ReadonlyArray<bigint>
  current: bigint
  onPick: (limit: bigint) => void
}): JSX.Element {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Gas limit</Text>
      <View style={styles.limitRow}>
        {presets.map(preset => (
          <Pressable
            key={preset.toString()}
            style={[styles.limitChip, current === preset && styles.limitChipActive]}
            onPress={() => onPick(preset)}
          >
            <Text style={[styles.limitChipText, current === preset && styles.limitChipTextActive]}>
              {formatGasLimit(preset)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

function UsdCostCard({
  gasLimit,
  usd,
  tier,
  chain
}: {
  gasLimit: bigint
  usd: number | null
  tier: GasTier | null
  chain: Chain
}): JSX.Element {
  const cfg = NetworkRegistry.get(chain)
  const wei = tier ? tier.maxFeePerGas * gasLimit : 0n
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Estimated total cost</Text>
      <Text style={styles.usdValue}>
        {usd === null ? "—" : `$${usd.toFixed(usd < 0.01 ? 6 : 4)}`}
      </Text>
      <Text style={styles.usdSub}>
        {toEther(wei)} {cfg.symbol} · limit {formatGasLimit(gasLimit)}
      </Text>
      <Text style={styles.usdHint}>
        Rate hardcoded ({cfg.symbol} = ${PriceRegistry.native(chain)}). Testnet — not real value.
      </Text>
    </View>
  )
}

function HistoryChart({
  samples,
  chain
}: {
  samples: ReadonlyArray<GasSample>
  chain: Chain
}): JSX.Element {
  if (samples.length < 2) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardLabel}>24h history</Text>
        <Text style={styles.usdHint}>
          {samples.length === 0
            ? "No samples yet — collected every 5 min."
            : "Need at least 2 samples for a line."}
        </Text>
      </View>
    )
  }
  // SVG canvas. Oldest sample on the left → newest on the right.
  const oldestFirst = [...samples].reverse()
  const baseFeesGwei = oldestFirst.map(s => Number(s.baseFee) / 1e9)
  const width = 280
  const height = 80
  const padding = 4
  const max = Math.max(...baseFeesGwei, 1)
  const min = Math.min(...baseFeesGwei, 0)
  const span = max - min || 1
  const stepX = (width - padding * 2) / Math.max(1, baseFeesGwei.length - 1)
  const points = baseFeesGwei
    .map((g, i) => {
      const x = padding + i * stepX
      const y = padding + (1 - (g - min) / span) * (height - padding * 2)
      return `${x},${y}`
    })
    .join(" ")
  const firstIso = oldestFirst[0]!.takenAtIso
  const lastIso = oldestFirst[oldestFirst.length - 1]!.takenAtIso
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>24h base-fee history ({chain})</Text>
      <Svg width={width} height={height}>
        <Rect x={0} y={0} width={width} height={height} fill="#F2F2F7" rx={6} />
        <Line
          x1={padding}
          x2={width - padding}
          y1={height - padding}
          y2={height - padding}
          stroke="#D0D0D5"
          strokeWidth={1}
        />
        <Polyline points={points} stroke="#007AFF" strokeWidth={2} fill="none" />
      </Svg>
      <View style={styles.chartAxisRow}>
        <Text style={styles.chartAxis}>{formatShortTime(firstIso)}</Text>
        <Text style={styles.chartAxis}>min {min.toFixed(2)} · max {max.toFixed(2)} gwei</Text>
        <Text style={styles.chartAxis}>{formatShortTime(lastIso)}</Text>
      </View>
    </View>
  )
}

function formatGasLimit(limit: bigint): string {
  const num = Number(limit)
  if (num >= 1000) return `${(num / 1000).toFixed(0)}k`
  return num.toString()
}

function formatShortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
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
  meta: { fontSize: 11, opacity: 0.5, textAlign: "center", marginTop: 4 },
  fallbackNote: {
    fontSize: 11,
    color: "#E65100",
    backgroundColor: "#FFF3E0",
    padding: 8,
    borderRadius: 6,
    textAlign: "center"
  },
  card: { backgroundColor: "#F8F8FA", borderRadius: 12, padding: 14, gap: 6 },
  cardLabel: { fontSize: 12, fontWeight: "600", opacity: 0.6 },
  limitRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  limitChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E0E0E0"
  },
  limitChipActive: { backgroundColor: "#007AFF", borderColor: "#007AFF" },
  limitChipText: { fontSize: 12, fontWeight: "500" },
  limitChipTextActive: { color: "#FFFFFF" },
  usdValue: { fontSize: 28, fontWeight: "700" },
  usdSub: { fontSize: 12, fontFamily: "Courier", opacity: 0.7 },
  usdHint: { fontSize: 10, opacity: 0.55, marginTop: 4 },
  chartAxisRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  chartAxis: { fontSize: 10, opacity: 0.55 }
})

export default GasOracleScreen
