import { type JSX } from "react"
import { Pressable, View, Text, StyleSheet, ActivityIndicator } from "react-native"
import type { PortfolioEntry } from "../models/portfolio.model"
import type Token from "../models/token.model"
import { NetworkRegistry } from "../core/constants/networks"
import { truncateAddress } from "../utils/format"
import TokenList from "./TokenList"

type Props = {
  entry: PortfolioEntry
  loading?: boolean
  tokens?: ReadonlyArray<Token>
  onPress?: () => void
}

function BalanceCard({ entry, loading = false, tokens, onPress }: Props): JSX.Element {
  const cfg = NetworkRegistry.get(entry.account.chain)

  const body = (
    <>
      <View style={styles.headerRow}>
        <Text style={styles.chainName}>{cfg.name}</Text>
        <Text style={styles.symbol}>{cfg.symbol}</Text>
      </View>
      <Text style={styles.address}>{truncateAddress(entry.account.address)}</Text>

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
    </>
  )

  if (onPress) {
    return (
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
        {body}
      </Pressable>
    )
  }

  return <View style={styles.card}>{body}</View>
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    gap: 4
  },
  pressed: { opacity: 0.7 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  chainName: { fontSize: 14, fontWeight: "600" },
  symbol: { fontSize: 11, opacity: 0.6 },
  address: { fontFamily: "Courier", fontSize: 11, opacity: 0.5 },
  amountRow: { marginTop: 6 },
  amount: { fontSize: 20, fontWeight: "700", fontVariant: ["tabular-nums"] },
  errorText: { fontSize: 12, color: "#B00020" }
})

export default BalanceCard
