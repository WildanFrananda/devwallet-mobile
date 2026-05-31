import { type JSX } from "react"
import { View, Text, StyleSheet } from "react-native"
import type { DecodedTx } from "../models/replay.model"

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
  box: { backgroundColor: "#F8F8FA", borderRadius: 12, padding: 14, gap: 6 },
  label: { fontSize: 11, fontWeight: "700", opacity: 0.55, marginTop: 6, textTransform: "uppercase" },
  value: { fontSize: 13, fontFamily: "Courier" },
  fnHighlight: {
    fontSize: 16,
    fontWeight: "700",
    color: "#007AFF",
    fontFamily: "Courier"
  },
  matchedAbi: { fontSize: 10, opacity: 0.5, marginTop: 2 },
  muted: { fontSize: 12, opacity: 0.55, marginTop: 4 },
  argRow: { marginTop: 8, gap: 2 },
  argLabel: { fontSize: 11, opacity: 0.65 },
  argValue: { fontSize: 12, fontFamily: "Courier" }
})

export default DecodedTxDisplay
