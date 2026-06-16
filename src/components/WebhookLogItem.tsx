import { type JSX } from "react"
import { View, Text, StyleSheet } from "react-native"
import type WebhookLog from "../models/webhook-log.model"

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
  logRow: { backgroundColor: "#F8F8FA", borderRadius: 10, padding: 10, gap: 4 },
  logHeader: { flexDirection: "row", justifyContent: "space-between" },
  logBlock: { fontSize: 12, fontWeight: "700" },
  logTime: { fontSize: 11, opacity: 0.55 },
  logHash: { fontSize: 11, fontFamily: "Courier", opacity: 0.7 },
  logArgs: { fontSize: 11, fontFamily: "Courier" }
})

export default WebhookLogItem
