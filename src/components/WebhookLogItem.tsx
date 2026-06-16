import { type JSX } from "react"
import { View, Text, StyleSheet } from "react-native"
import type WebhookLog from "../models/webhook-log.model"
import { colors, typography, spacing, radius, hairline } from "../theme"

type Props = {
  log: WebhookLog
  testID?: string
}

/** A single on-chain webhook log row: block + time, tx hash, decoded args. */
function WebhookLogItem({ log, testID }: Props): JSX.Element {
  return (
    <View style={styles.logRow} testID={testID}>
      <View style={styles.logHeader}>
        <Text style={styles.logBlock}>block {log.blockNumber ?? "?"}</Text>
        <Text style={styles.logTime}>{log.firedAt.toLocaleTimeString()}</Text>
      </View>
      {log.txHash && (
        <Text style={styles.logHash} selectable>
          {log.txHash}
        </Text>
      )}
      <Text style={styles.logArgs}>{JSON.stringify(log.decodedArgs ?? {}, null, 2)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  logRow: {
    backgroundColor: colors.elevation1,
    borderRadius: radius.lg,
    borderWidth: hairline,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs
  },
  logHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logBlock: { ...typography.monoLabelSm, color: colors.textPrimary },
  logTime: { ...typography.monoDataSm, color: colors.textMuted },
  logHash: { ...typography.monoDataSm, color: colors.accentText },
  logArgs: { ...typography.monoDataSm, color: colors.textSecondary }
})

export default WebhookLogItem
