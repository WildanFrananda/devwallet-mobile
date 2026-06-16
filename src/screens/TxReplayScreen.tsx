import { type JSX } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Linking
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import { useViewModel, useStream } from "react-native-mobile-mvvm"
import TxReplayViewModel from "../viewmodels/TxReplayViewModel"
import DecodedTxDisplay from "../components/DecodedTxDisplay"
import { Chain } from "../core/constants/chains.enum"
import { NetworkRegistry } from "../core/constants/networks"
import { REPLAY_ORIGINS, REPLAY_TARGET_CHAINS, sourceFor } from "../core/constants/replay-sources"
import type { ReplayOriginChain } from "../models/replay.model"
import DotGridBackground from "../components/DotGridBackground"
import { colors, typography, spacing, radius, hairline, chainColors, type ChainColorKey } from "../theme"

function TxReplayScreen(): JSX.Element {
  const vm = useViewModel(TxReplayViewModel)
  const nav = useNavigation()
  const insets = useSafeAreaInsets()
  const origin = useStream(vm.origin$, vm.origin$.value)
  const inputHash = useStream(vm.inputHash$, vm.inputHash$.value)
  const extraAbi = useStream(vm.extraAbi$, vm.extraAbi$.value)
  const decoded = useStream(vm.decoded$, vm.decoded$.value)
  const replayChain = useStream(vm.replayChain$, vm.replayChain$.value)
  const valueOverride = useStream(vm.valueOverride$, vm.valueOverride$.value)
  const replayState = useStream(vm.replayState$, vm.replayState$.value)
  const history = useStream(vm.history$, vm.history$.value)

  function explorerForOrigin(o: ReplayOriginChain, hash: string): string {
    return sourceFor(o).explorerTxUrl(hash)
  }

  function explorerForReplay(chain: Chain, hash: string): string | null {
    try {
      const cfg = NetworkRegistry.get(chain)
      return cfg.explorerUrl ? `${cfg.explorerUrl}/tx/${hash}` : null
    } catch {
      return null
    }
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <DotGridBackground />
      <View style={styles.headerBar}>
        <Pressable onPress={() => nav.goBack()} hitSlop={8}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>TX Replay</Text>
        <View style={styles.right} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.sectionLabel}>ORIGIN (MAINNET, READ-ONLY)</Text>
        <View style={styles.chipRow}>
          {REPLAY_ORIGINS.map(o => (
            <Pressable
              key={o}
              style={[styles.chip, origin === o && styles.chipActive]}
              onPress={() => vm.setOrigin(o)}
            >
              <Text style={[styles.chipText, origin === o && styles.chipTextActive]}>{o}</Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          style={[styles.input, styles.mono]}
          placeholder="0x… tx hash"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          value={inputHash}
          onChangeText={(v: string) => vm.setInputHash(v)}
        />
        <TextInput
          style={[styles.input, styles.abi]}
          placeholder="Optional ABI JSON (improves decode for unknown contracts)"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          value={extraAbi}
          onChangeText={(v: string) => vm.setExtraAbi(v)}
        />

        <Pressable style={styles.primaryBtn} onPress={() => vm.fetchAndDecode()}>
          <Text style={styles.primaryBtnText}>Fetch + decode</Text>
        </Pressable>

        {decoded.status === "loading" && (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        )}
        {decoded.status === "error" && <Text style={styles.errorText}>{decoded.message}</Text>}
        {decoded.status === "success" && (
          <>
            <DecodedTxDisplay decoded={decoded.data} />

            <Text style={styles.sectionLabel}>REPLAY TARGET (TESTNET)</Text>
            <View style={styles.chipRow}>
              {REPLAY_TARGET_CHAINS.map(c => {
                const active = replayChain === c
                const hue = chainColors[c as ChainColorKey] ?? colors.border
                return (
                  <Pressable
                    key={c}
                    style={[styles.chip, active && { backgroundColor: hue + "1f", borderColor: hue }]}
                    onPress={() => vm.setReplayChain(c)}
                  >
                    <View style={[styles.chipDot, { backgroundColor: hue }]} />
                    <Text style={[styles.chipText, active && { color: colors.textPrimary }]}>
                      {NetworkRegistry.get(c).symbol}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            <Text style={styles.sectionLabel}>VALUE OVERRIDE (WEI, DEFAULT 0)</Text>
            <TextInput
              style={[styles.input, styles.mono]}
              keyboardType="number-pad"
              placeholderTextColor={colors.textMuted}
              value={valueOverride}
              onChangeText={(v: string) => vm.setValueOverride(v)}
            />

            <Pressable
              style={[styles.primaryBtn, styles.executeBtn]}
              onPress={() => vm.executeReplay()}
            >
              <Text style={styles.primaryBtnText}>Replay on testnet</Text>
            </Pressable>

            {replayState.status === "loading" && (
              <View style={styles.center}>
                <ActivityIndicator />
              </View>
            )}
            {replayState.status === "error" && (
              <Text style={styles.errorText}>{replayState.message}</Text>
            )}
            {replayState.status === "success" && (
              <View style={styles.outcomeBox}>
                <Text style={styles.outcomeLabel}>Broadcast tx</Text>
                <Text style={styles.outcomeValue} selectable>
                  {replayState.data.replayHash}
                </Text>
                {replayState.data.replayHash !== null &&
                  (() => {
                    const url = explorerForReplay(
                      replayState.data.replayChain,
                      replayState.data.replayHash
                    )
                    if (!url) return null
                    return (
                      <Pressable onPress={() => void Linking.openURL(url)}>
                        <Text style={styles.explorerLink}>Open in explorer ↗</Text>
                      </Pressable>
                    )
                  })()}
              </View>
            )}
          </>
        )}

        <Text style={styles.sectionLabel}>History</Text>
        {history.length === 0 ? (
          <Text style={styles.muted}>No replays saved yet.</Text>
        ) : (
          history.map(r => (
            <Pressable
              key={r.id}
              style={styles.historyRow}
              onPress={() => vm.reloadFromHistory(r.id)}
              onLongPress={() => vm.deleteReplay(r.id)}
            >
              <Text style={styles.historyFn}>
                {r.decoded.functionName ?? "<raw bytes>"} · {r.originChain} → {r.replayChain}
              </Text>
              <Text style={styles.historyHash} selectable>
                {r.originHash.slice(0, 14)}…
              </Text>
              <Text style={styles.historyMeta}>
                {r.status} · {r.createdAt.toLocaleString()}
              </Text>
              <Pressable
                onPress={() =>
                  void Linking.openURL(explorerForOrigin(r.originChain, r.originHash))
                }
              >
                <Text style={styles.explorerLink}>origin ↗</Text>
              </Pressable>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  )
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
  title: { ...typography.titleMd, color: colors.textPrimary },
  right: { width: 36 },
  body: { padding: spacing.lg, gap: spacing.sm },
  sectionLabel: { ...typography.labelXs, color: colors.textMuted, marginTop: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, paddingVertical: spacing.xs },
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
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { ...typography.monoLabelSm, color: colors.textSecondary, textTransform: "capitalize" },
  chipTextActive: { color: colors.onAccent },
  input: {
    backgroundColor: colors.elevation1,
    borderWidth: hairline,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    letterSpacing: 0,
    color: colors.textPrimary
  },
  mono: { ...typography.monoDataSm, fontSize: 13, color: colors.textPrimary },
  abi: { minHeight: 100, ...typography.monoDataSm, color: colors.textPrimary, textAlignVertical: "top" },
  primaryBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    marginTop: spacing.sm,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4
  },
  primaryBtnText: { ...typography.monoLabelSm, fontSize: 13, color: colors.onAccent },
  executeBtn: { backgroundColor: colors.accentWarm, shadowColor: colors.accentWarm },
  center: { padding: 24, alignItems: "center" },
  errorText: { ...typography.monoDataSm, color: colors.error, padding: spacing.sm },
  outcomeBox: {
    backgroundColor: colors.successGlow,
    borderWidth: hairline,
    borderColor: colors.success + "55",
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    marginTop: spacing.sm
  },
  outcomeLabel: { ...typography.labelXs, color: colors.textMuted },
  outcomeValue: { ...typography.monoDataSm, color: colors.textSecondary },
  explorerLink: { ...typography.monoLabelSm, color: colors.accentText, marginTop: spacing.xxs },
  muted: { ...typography.monoDataSm, color: colors.textMuted, paddingVertical: spacing.xs },
  historyRow: {
    backgroundColor: colors.elevation1,
    borderRadius: radius.lg,
    borderWidth: hairline,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xxs,
    marginBottom: spacing.sm
  },
  historyFn: { ...typography.monoDataSm, fontSize: 13, color: colors.textPrimary },
  historyHash: { ...typography.monoDataSm, color: colors.textMuted },
  historyMeta: { ...typography.monoDataSm, color: colors.textMuted }
})

export default TxReplayScreen
