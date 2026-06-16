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
import DotGridBackground from "../components/DotGridBackground"
import { colors, typography, spacing, radius, hairline, chainColors, type ChainColorKey } from "../theme"

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
      <DotGridBackground />
      <View style={styles.headerBar}>
        <Pressable onPress={() => nav.goBack()} hitSlop={8}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Gas Oracle</Text>
        <Pressable onPress={() => vm.refresh()} hitSlop={8}>
          <Text style={styles.refresh}>↻</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.chipRow}>
          {vm.chains.map(c => {
            const active = chain === c
            const hue = chainColors[c as ChainColorKey] ?? colors.border
            return (
              <Pressable
                key={c}
                style={[styles.chip, active && { backgroundColor: hue + "1f", borderColor: hue }]}
                onPress={() => vm.setChain(c)}
              >
                <View style={[styles.chipDot, { backgroundColor: hue }]} />
                <Text style={[styles.chipText, active && { color: colors.textPrimary }]}>
                  {NetworkRegistry.get(c).symbol}
                </Text>
              </Pressable>
            )
          })}
        </View>

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
        <Rect x={0} y={0} width={width} height={height} fill={colors.elevation0} rx={6} />
        <Line
          x1={padding}
          x2={width - padding}
          y1={height - padding}
          y2={height - padding}
          stroke={colors.border}
          strokeWidth={1}
        />
        <Polyline points={points} stroke={colors.accent} strokeWidth={2} fill="none" />
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
  safe: { flex: 1, backgroundColor: colors.background },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm
  },
  back: { ...typography.monoLabelSm, color: colors.accentText },
  refresh: { fontSize: 18, color: colors.accentText },
  title: { ...typography.titleMd, color: colors.textPrimary },
  body: { padding: spacing.lg, gap: spacing.md },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, paddingBottom: spacing.xs },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.elevation1,
    borderWidth: hairline,
    borderColor: colors.border,
    borderRadius: radius.full
  },
  chipDot: { width: 7, height: 7, borderRadius: radius.full },
  chipText: { ...typography.monoLabelSm, color: colors.textSecondary },
  center: { padding: 32, alignItems: "center" },
  error: { ...typography.bodyMd, color: colors.error, padding: spacing.md, textAlign: "center" },
  chart: {
    backgroundColor: colors.elevation1,
    borderRadius: radius.lg,
    borderWidth: hairline,
    borderColor: colors.border,
    padding: spacing.md
  },
  chartLabel: { ...typography.labelXs, color: colors.textMuted, marginBottom: spacing.sm },
  chartBars: { flexDirection: "row", alignItems: "flex-end", gap: 3, height: 70 },
  chartBar: { flex: 1, backgroundColor: colors.accent, borderRadius: 2, opacity: 0.7 },
  tier: {
    backgroundColor: colors.elevation1,
    borderRadius: radius.lg,
    borderWidth: hairline,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs
  },
  tierSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentGlow,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3
  },
  tierHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tierLabel: { ...typography.monoLabelSm, fontSize: 13, color: colors.textPrimary },
  tierCheck: { color: colors.accent, fontSize: 16 },
  tierRow: { flexDirection: "row", justifyContent: "space-between" },
  tierKey: { ...typography.monoDataSm, color: colors.textMuted },
  tierVal: { ...typography.monoDataSm, color: colors.textSecondary },
  meta: { ...typography.monoDataSm, color: colors.textMuted, textAlign: "center", marginTop: spacing.xs },
  fallbackNote: {
    ...typography.monoDataSm,
    color: colors.accentWarm,
    backgroundColor: colors.accentWarm + "14",
    borderWidth: hairline,
    borderColor: colors.accentWarm + "44",
    padding: spacing.sm,
    borderRadius: radius.sm,
    textAlign: "center"
  },
  card: {
    backgroundColor: colors.elevation1,
    borderRadius: radius.lg,
    borderWidth: hairline,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs
  },
  cardLabel: { ...typography.labelXs, color: colors.textMuted },
  limitRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.xs },
  limitChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.elevation2,
    borderRadius: radius.full,
    borderWidth: hairline,
    borderColor: colors.border
  },
  limitChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  limitChipText: { ...typography.monoLabelSm, color: colors.textSecondary },
  limitChipTextActive: { color: colors.onAccent },
  usdValue: { ...typography.headlineLg, color: colors.textPrimary },
  usdSub: { ...typography.monoDataSm, color: colors.textSecondary },
  usdHint: { ...typography.monoDataSm, fontSize: 10, color: colors.textMuted, marginTop: spacing.xs },
  chartAxisRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs },
  chartAxis: { ...typography.monoDataSm, fontSize: 10, color: colors.textMuted }
})

export default GasOracleScreen
