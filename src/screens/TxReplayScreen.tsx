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
      <View style={styles.headerBar}>
        <Pressable onPress={() => nav.goBack()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>TX Replay</Text>
        <View style={styles.right} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.sectionLabel}>Origin (mainnet, read-only)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {REPLAY_ORIGINS.map(o => (
            <Pressable
              key={o}
              style={[styles.chip, origin === o && styles.chipActive]}
              onPress={() => vm.setOrigin(o)}
            >
              <Text style={[styles.chipText, origin === o && styles.chipTextActive]}>{o}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <TextInput
          style={styles.input}
          placeholder="0x… tx hash"
          autoCapitalize="none"
          autoCorrect={false}
          value={inputHash}
          onChangeText={(v: string) => vm.setInputHash(v)}
        />
        <TextInput
          style={[styles.input, styles.abi]}
          placeholder="Optional ABI JSON (improves decode for unknown contracts)"
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

            <Text style={styles.sectionLabel}>Replay target (testnet)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {REPLAY_TARGET_CHAINS.map(c => (
                <Pressable
                  key={c}
                  style={[styles.chip, replayChain === c && styles.chipActive]}
                  onPress={() => vm.setReplayChain(c)}
                >
                  <Text style={[styles.chipText, replayChain === c && styles.chipTextActive]}>
                    {NetworkRegistry.get(c).symbol}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.sectionLabel}>Value override (wei, default 0)</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
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
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  back: { color: "#007AFF", fontSize: 14 },
  title: { fontSize: 18, fontWeight: "700" },
  right: { width: 36 },
  body: { padding: 16, gap: 8 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    opacity: 0.55,
    textTransform: "uppercase",
    marginTop: 10
  },
  chipRow: { gap: 8, paddingVertical: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F2F2F7",
    borderRadius: 16
  },
  chipActive: { backgroundColor: "#007AFF" },
  chipText: { fontSize: 12, fontWeight: "500", color: "#1C1C1E", textTransform: "capitalize" },
  chipTextActive: { color: "#FFFFFF" },
  input: {
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14
  },
  abi: { minHeight: 100, fontFamily: "Courier", fontSize: 12, textAlignVertical: "top" },
  primaryBtn: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "600" },
  executeBtn: { backgroundColor: "#E65100" },
  center: { padding: 24, alignItems: "center" },
  errorText: { color: "#B00020", padding: 8 },
  outcomeBox: { backgroundColor: "#E6F4EA", borderRadius: 10, padding: 12, gap: 4, marginTop: 8 },
  outcomeLabel: { fontSize: 11, fontWeight: "700", opacity: 0.6 },
  outcomeValue: { fontSize: 12, fontFamily: "Courier" },
  explorerLink: { color: "#0066CC", fontSize: 12, marginTop: 4 },
  muted: { fontSize: 12, opacity: 0.55, paddingVertical: 6 },
  historyRow: {
    backgroundColor: "#F8F8FA",
    borderRadius: 10,
    padding: 12,
    gap: 4,
    marginBottom: 8
  },
  historyFn: { fontSize: 13, fontWeight: "600", fontFamily: "Courier" },
  historyHash: { fontSize: 11, fontFamily: "Courier", opacity: 0.6 },
  historyMeta: { fontSize: 11, opacity: 0.55 }
})

export default TxReplayScreen
