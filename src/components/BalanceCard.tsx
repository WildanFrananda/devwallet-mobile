import { type JSX } from "react"
import { Pressable, View, Text, StyleSheet, ActivityIndicator } from "react-native"
import type { PortfolioEntry } from "../models/portfolio.model"
import type Token from "../models/token.model"
import { NetworkRegistry } from "../core/constants/networks"
import { truncateAddress } from "../utils/format"
import TokenList from "./TokenList"
import { colors, typography, spacing, radius, hairline, chainColors, type ChainColorKey } from "../theme"

type Props = {
  entry: PortfolioEntry
  loading?: boolean
  tokens?: ReadonlyArray<Token>
  onPress?: () => void
  testID?: string
}

function BalanceCard({ entry, loading = false, tokens, onPress, testID }: Props): JSX.Element {
  const cfg = NetworkRegistry.get(entry.account.chain)
  const dot = chainColors[entry.account.chain as ChainColorKey] ?? colors.border

  const body = (
    <>
      <View style={styles.headerRow}>
        <View style={styles.chainLabel}>
          <View style={[styles.dot, { backgroundColor: dot }]} />
          <Text style={styles.chainName}>{cfg.name}</Text>
        </View>
        <Text style={styles.symbol}>{cfg.symbol}</Text>
      </View>
      <Text style={styles.address}>{truncateAddress(entry.account.address)}</Text>

      <View style={styles.amountRow}>
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : entry.balance ? (
          <Text style={styles.amount}>{entry.balance.formatted}</Text>
        ) : (
          <Text style={styles.errorText}>— {entry.error ?? "not available"}</Text>
        )}
      </View>

      <TokenList tokens={tokens} />
    </>
  )

  // Each card's border carries its chain color at low opacity — kills the
  // identical-box problem, signals "belongs to network X".
  const cardStyle = [styles.card, { borderColor: dot + "55" }]

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
        onPress={onPress}
      >
        {body}
      </Pressable>
    )
  }

  return (
    <View style={cardStyle} testID={testID}>
      {body}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    backgroundColor: colors.elevation1,
    borderRadius: radius.lg,
    borderWidth: hairline,
    borderColor: colors.border,
    gap: spacing.xs
  },
  pressed: {
    backgroundColor: colors.elevation2,
    transform: [{ scale: 0.99 }]
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  chainLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full
  },
  chainName: {
    ...typography.bodyLg,
    fontWeight: "600",
    color: colors.textPrimary
  },
  symbol: {
    ...typography.monoLabelSm,
    color: colors.textMuted
  },
  address: {
    ...typography.monoDataSm,
    color: colors.textMuted
  },
  amountRow: {
    marginTop: spacing.sm
  },
  amount: {
    ...typography.monoDataMd,
    fontSize: 20,
    lineHeight: 26,
    color: colors.textPrimary
  },
  errorText: {
    ...typography.monoDataSm,
    color: colors.error
  }
})

export default BalanceCard
