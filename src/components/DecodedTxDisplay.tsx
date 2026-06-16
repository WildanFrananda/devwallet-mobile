import { type JSX } from "react"
import { View, Text, StyleSheet } from "react-native"
import type { DecodedTx } from "../models/replay.model"
import { colors, typography, spacing, radius, hairline } from "../theme"

function DecodedTxDisplay({ decoded }: { decoded: DecodedTx }): JSX.Element {
  return (
    <View style={styles.box}>
      <Text style={styles.label}>From → To</Text>
      <Text style={styles.value}>
        {short(decoded.from)} → {decoded.to ? short(decoded.to) : "<contract creation>"}
      </Text>

      <Text style={styles.label}>Value (origin)</Text>
      <Text style={styles.value}>{decoded.value.toString()} wei</Text>

      <Text style={styles.label}>Function</Text>
      {decoded.functionName ? (
        <View>
          <Text style={styles.fnHighlight}>{decoded.functionName}</Text>
          {decoded.matchedAbi && (
            <Text style={styles.matchedAbi}>(matched via {decoded.matchedAbi} ABI)</Text>
          )}
          {decoded.args.length === 0 ? (
            <Text style={styles.muted}>no args</Text>
          ) : (
            decoded.args.map((arg, i) => (
              <View key={`${arg.name}-${i}`} style={styles.argRow}>
                <Text style={styles.argLabel}>
                  {arg.name || `arg${i}`}: {arg.type}
                </Text>
                <Text style={styles.argValue} selectable>
                  {arg.value}
                </Text>
              </View>
            ))
          )}
        </View>
      ) : (
        <>
          <Text style={styles.muted}>Selector not in common ABI. Raw input:</Text>
          <Text style={styles.argValue} selectable>
            {decoded.input}
          </Text>
        </>
      )}
    </View>
  )
}

function short(addr: string): string {
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.elevation1,
    borderRadius: radius.lg,
    borderWidth: hairline,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs
  },
  label: { ...typography.labelXs, color: colors.textMuted, marginTop: spacing.xs },
  value: { ...typography.monoDataSm, color: colors.textSecondary },
  fnHighlight: { ...typography.monoDataMd, color: colors.accentText },
  matchedAbi: { ...typography.monoDataSm, fontSize: 10, color: colors.textMuted, marginTop: spacing.xxs },
  muted: { ...typography.monoDataSm, color: colors.textMuted, marginTop: spacing.xs },
  argRow: { marginTop: spacing.sm, gap: spacing.xxs },
  argLabel: { ...typography.monoDataSm, color: colors.textMuted },
  argValue: { ...typography.monoDataSm, color: colors.textPrimary }
})

export default DecodedTxDisplay
