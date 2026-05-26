import { type JSX } from "react"
import { View, Text, StyleSheet, ActivityIndicator } from "react-native"
import type { PortfolioEntry } from "../models/portfolio.model"
import type Token from "../models/token.model"
import { NetworkRegistry } from "../core/constants/networks"
import TokenList from "./TokenList"

type Props = {
  entry: PortfolioEntry
  loading?: boolean
  tokens?: ReadonlyArray<Token>
}

function truncate(address: string, head: number = 6, tail: number = 4): string {
  if (address.length <= head + tail + 3) return address
  return `${address.slice(0, head)}…${address.slice(-tail)}`
}

function BalanceCard({ entry, loading = false, tokens }: Props): JSX.Element {
  const cfg = NetworkRegistry.get(entry.account.chain)

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.chainName}>{cfg.name}</Text>
        <Text style={styles.symbol}>{cfg.symbol}</Text>
      </View>
      <Text style={styles.address}>{truncate(entry.account.address)}</Text>

      <View style={styles.amountRow}>
        {loading ? (
          <ActivityIndicator />
        ) : entry.balance ? (
          <Text style={styles.amount}>{entry.balance.formatted}</Text>
        ) : (
          <Text style={styles.errorText}>— {entry.error ?? "not available"}</Text>
        )}
      </View>

      <TokenList tokens={tokens} />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    gap: 4
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  chainName: { fontSize: 14, fontWeight: "600" },
  symbol: { fontSize: 11, opacity: 0.6 },
  address: { fontFamily: "Courier", fontSize: 11, opacity: 0.5 },
  amountRow: { marginTop: 6 },
  amount: { fontSize: 20, fontWeight: "700", fontVariant: ["tabular-nums"] },
  errorText: { fontSize: 12, color: "#B00020" }
})

export default BalanceCard
