import { type JSX } from "react"
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native"

type Props = {
  value: string
  symbol: string
  onChange: (next: string) => void
  placeholder?: string
  label?: string
  onMaxPress?: () => void
  maxLoading?: boolean
}

function AmountInput({
  value,
  symbol,
  onChange,
  placeholder = "0.0",
  label,
  onMaxPress,
  maxLoading
}: Props): JSX.Element {
  return (
    <View style={styles.field}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          keyboardType="decimal-pad"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {onMaxPress && (
          <Pressable style={styles.maxBtn} onPress={onMaxPress} disabled={maxLoading}>
            {maxLoading ? <ActivityIndicator size="small" /> : <Text style={styles.maxLabel}>MAX</Text>}
          </Pressable>
        )}
        <Text style={styles.symbol}>{symbol}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  field: { gap: 4 },
  label: { fontSize: 12, opacity: 0.7 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    borderRadius: 8,
    paddingRight: 12
  },
  input: { flex: 1, padding: 12, fontSize: 16 },
  maxBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "#007AFF", borderRadius: 6, marginRight: 8 },
  maxLabel: { color: "#FFFFFF", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  symbol: { fontSize: 13, fontWeight: "600", opacity: 0.6 }
})

export default AmountInput
