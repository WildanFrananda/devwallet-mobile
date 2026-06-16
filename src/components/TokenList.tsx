import { type JSX } from "react"
import { View, Text, StyleSheet } from "react-native"
import type Token from "../models/token.model"
import { colors, typography, spacing, hairline } from "../theme"

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
  list: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    gap: spacing.xs,
    borderTopWidth: hairline,
    borderColor: colors.border
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  symbol: {
    ...typography.monoLabelSm,
    color: colors.textSecondary
  },
  amount: {
    ...typography.monoDataSm,
    color: colors.textSecondary
  }
})

export default TokenList
