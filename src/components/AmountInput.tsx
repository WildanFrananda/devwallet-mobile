import { type JSX } from "react"
import { View, Text, TextInput, StyleSheet } from "react-native"

type Props = {
  value: string
  symbol: string
  onChange: (next: string) => void
  placeholder?: string
  label?: string
}

function AmountInput({ value, symbol, onChange, placeholder = "0.0", label }: Props): JSX.Element {
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
  symbol: { fontSize: 13, fontWeight: "600", opacity: 0.6 }
})

export default AmountInput
