import { type JSX } from "react"
import { View, Text, StyleSheet } from "react-native"
import type Token from "../models/token.model"

type Props = {
  tokens: ReadonlyArray<Token> | undefined
}

function TokenList({ tokens }: Props): JSX.Element | null {
  if (!tokens || tokens.length === 0) return null

  return (
    <View style={styles.list}>
      {tokens.map(t => (
        <View key={t.contractAddress} style={styles.row}>
          <Text style={styles.symbol}>{t.symbol}</Text>
          <Text style={styles.amount}>{t.formatted}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { marginTop: 8, gap: 4, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderColor: "#D1D1D6" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  symbol: { fontSize: 12, opacity: 0.7 },
  amount: { fontSize: 12, fontVariant: ["tabular-nums"] }
})

export default TokenList
