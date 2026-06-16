import { type JSX } from "react"
import { View, Text, StyleSheet, Pressable, Linking } from "react-native"
import type { ChainRow } from "../viewmodels/FaucetViewModel"
import type { NetworkConfig } from "../core/constants/networks"
import { truncateAddress } from "../utils/format"

type Props = {
  cfg: NetworkConfig
  address: string | undefined
  row: ChainRow | undefined
  /** Re-render tick (ms) so rate-limit countdowns update live. */
  now: number
  /** Stable per-chain slug for testIDs (faucet.row.<slug>.*). */
  slug: string
  onRequest: () => void
}

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

function formatCountdown(ms: number): string {
  const secs = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

/** One faucet chain row: address, status badge, amount/tx on success, error +
 * rate-limit countdown on failure, and a Request/Retry/Request-again button. */
function FaucetChainCard({ cfg, address, row, now, slug, onRequest }: Props): JSX.Element {
  const status = row?.status ?? "idle"
  const stillLimited = !!(row?.rateLimitedUntilMs && row.rateLimitedUntilMs > now)
  const canRequest = (status === "idle" || status === "failed" || status === "completed") && !!address

  return (
    <View style={styles.row} testID={`faucet.row.${slug}`}>
      <View style={styles.rowHeader}>
        <View style={styles.rowLabelCol}>
          <Text style={styles.chainName}>
            {cfg.name} <Text style={styles.symbol}>{cfg.symbol}</Text>
          </Text>
          <Text style={styles.addressLine}>{address ? truncateAddress(address) : "—"}</Text>
        </View>
        <View
          style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[status] }]}
          testID={`faucet.row.${slug}.status-${status}`}
        >
          <Text style={styles.statusBadgeText}>{STATUS_LABEL[status] ?? status}</Text>
        </View>
      </View>

      {row?.amount && row.status === "completed" && (
        <Text style={styles.amountLine} testID={`faucet.row.${slug}.amount`}>
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
        <Pressable style={styles.openFaucetBtn} onPress={() => void Linking.openURL(row.manualUrl ?? "")}>
          <Text style={styles.openFaucetBtnText}>Open faucet ↗</Text>
        </Pressable>
      )}

      {canRequest && (
        <Pressable
          testID={`faucet.row.${slug}.request`}
          style={[styles.retryBtn, stillLimited && styles.retryBtnDisabled]}
          onPress={onRequest}
          disabled={stillLimited}
        >
          <Text style={styles.retryBtnText}>
            {status === "completed" ? "Request again" : status === "failed" ? "Retry" : "Request"}
          </Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 14, gap: 8 },
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
  retryBtnText: { fontSize: 13, fontWeight: "500" }
})

export default FaucetChainCard
