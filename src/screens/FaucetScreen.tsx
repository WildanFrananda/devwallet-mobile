import { useEffect, useState, type JSX } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
  RefreshControl
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useViewModel, useStream, useInit } from "react-native-mobile-mvvm"
import FaucetViewModel from "../viewmodels/FaucetViewModel"
import { Chain } from "../core/constants/chains.enum"
import { NetworkRegistry } from "../core/constants/networks"
import { truncateAddress } from "../utils/format"

/** Ticks every `intervalMs` so rate-limit countdowns re-render live. */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState<number>(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

function formatCountdown(ms: number): string {
  const secs = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

const ROW_ORDER: ReadonlyArray<Chain> = [
  Chain.EVM_SEPOLIA,
  Chain.EVM_POLYGON_AMOY,
  Chain.EVM_BASE_SEPOLIA,
  Chain.BITCOIN_TESTNET,
  Chain.SOLANA_DEVNET,
  Chain.COSMOS_THETA,
  Chain.XRPL_TESTNET,
  Chain.STARKNET_SEPOLIA
]

const STATUS_LABEL: Readonly<Record<string, string>> = {
  idle: "—",
  pending: "Queued",
  processing: "Processing",
  completed: "Sent",
  failed: "Failed"
}

const STATUS_COLOR: Readonly<Record<string, string>> = {
  idle: "#9AA0A6",
  pending: "#B27800",
  processing: "#0066CC",
  completed: "#0A7",
  failed: "#B00020"
}

function FaucetScreen(): JSX.Element {
  const insets = useSafeAreaInsets()
  const vm = useViewModel(FaucetViewModel)
  const rows = useStream(vm.rows$, vm.rows$.value)
  const addresses = useStream(vm.addresses$, vm.addresses$.value)
  const now = useNow(1000)

  useInit(() => vm.initialize(0))

  const isLoadingAddresses = addresses.status === "loading"
  const addressError = addresses.status === "error" ? addresses.message : null
  const addressMap = addresses.status === "success" ? addresses.data : {}

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.headerBar}>
        <Text style={styles.title}>Faucet</Text>
        <Pressable
          style={[styles.requestAllBtn, addresses.status !== "success" && styles.requestAllBtnDisabled]}
          onPress={() => vm.requestAll()}
          disabled={addresses.status !== "success"}
        >
          <Text style={styles.requestAllLabel}>Request all</Text>
        </Pressable>
      </View>

      {addressError && <Text style={styles.error}>{addressError}</Text>}

      {isLoadingAddresses ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => vm.initialize(0)} />}
        >
          {ROW_ORDER.map(chain => {
            const cfg = NetworkRegistry.get(chain)
            const address = addressMap[chain]
            const row = rows[chain]
            const status = row?.status ?? "idle"
            return (
              <View key={chain} style={styles.row}>
                <View style={styles.rowHeader}>
                  <View style={styles.rowLabelCol}>
                    <Text style={styles.chainName}>
                      {cfg.name} <Text style={styles.symbol}>{cfg.symbol}</Text>
                    </Text>
                    <Text style={styles.addressLine}>{address ? truncateAddress(address) : "—"}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[status] }]}>
                    <Text style={styles.statusBadgeText}>{STATUS_LABEL[status] ?? status}</Text>
                  </View>
                </View>

                {row?.amount && row.status === "completed" && (
                  <Text style={styles.amountLine}>
                    +{row.amount} {cfg.symbol}
                  </Text>
                )}

                {row?.txHash && row.status === "completed" && cfg.explorerUrl && (
                  <Pressable onPress={() => void Linking.openURL(`${cfg.explorerUrl}/tx/${row.txHash ?? ""}`)}>
                    <Text style={styles.txLink} numberOfLines={1}>
                      {row.txHash}
                    </Text>
                  </Pressable>
                )}

                {row?.errorMessage && row.status === "failed" && (
                  <Text style={styles.errorLine}>{row.errorMessage}</Text>
                )}

                {row?.rateLimitedUntilMs && row.rateLimitedUntilMs > now && (
                  <Text style={styles.countdownLine}>
                    Try again in {formatCountdown(row.rateLimitedUntilMs - now)}
                  </Text>
                )}

                {row?.manualUrl && (
                  <Pressable
                    style={styles.openFaucetBtn}
                    onPress={() => void Linking.openURL(row.manualUrl ?? "")}
                  >
                    <Text style={styles.openFaucetBtnText}>Open faucet ↗</Text>
                  </Pressable>
                )}

                {(status === "idle" || status === "failed" || status === "completed") && address && (() => {
                  const stillLimited = !!(row?.rateLimitedUntilMs && row.rateLimitedUntilMs > now)
                  return (
                    <Pressable
                      style={[styles.retryBtn, stillLimited && styles.retryBtnDisabled]}
                      onPress={() => vm.requestSingle(chain)}
                      disabled={stillLimited}
                    >
                      <Text style={styles.retryBtnText}>
                        {status === "completed" ? "Request again" : status === "failed" ? "Retry" : "Request"}
                      </Text>
                    </Pressable>
                  )
                })()}
              </View>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F8FA" },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12
  },
  title: { fontSize: 24, fontWeight: "700" },
  requestAllBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#007AFF",
    borderRadius: 8
  },
  requestAllBtnDisabled: { backgroundColor: "#A8C7FA" },
  requestAllLabel: { color: "#FFFFFF", fontWeight: "600", fontSize: 13 },
  list: { padding: 16, gap: 10 },
  row: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    gap: 8
  },
  rowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  rowLabelCol: { flex: 1, gap: 2 },
  chainName: { fontSize: 15, fontWeight: "600" },
  symbol: { fontSize: 12, fontWeight: "500", opacity: 0.6 },
  addressLine: { fontSize: 11, opacity: 0.55, fontFamily: "Courier" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusBadgeText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  amountLine: { fontSize: 14, fontWeight: "600", color: "#0A7" },
  txLink: { fontSize: 11, color: "#0066CC", fontFamily: "Courier" },
  errorLine: { fontSize: 12, color: "#B00020" },
  countdownLine: { fontSize: 11, color: "#B27800", fontWeight: "600" },
  openFaucetBtn: {
    backgroundColor: "#EEF6FB",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center"
  },
  openFaucetBtnText: { color: "#0066CC", fontSize: 13, fontWeight: "600" },
  retryBtn: {
    backgroundColor: "#F2F2F7",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center"
  },
  retryBtnDisabled: { opacity: 0.4 },
  retryBtnText: { fontSize: 13, fontWeight: "500" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { color: "#B00020", paddingHorizontal: 20, paddingVertical: 8, textAlign: "center" }
})

export default FaucetScreen
