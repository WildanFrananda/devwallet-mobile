import { useState, type JSX } from "react"
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

type Props = {
  onSubmit: (pin: string) => void
  busy?: boolean
  errorMessage?: string | null
}

function MigrateScreen({ onSubmit, busy, errorMessage }: Props): JSX.Element {
  const insets = useSafeAreaInsets()
  const [pin, setPin] = useState<string>("")

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.container}>
        <Text style={styles.title}>Update security</Text>
        <Text style={styles.subtitle}>
          DevWallet now encrypts your recovery phrase with your PIN before storing it. Re-enter your existing 6-digit
          PIN to upgrade.
        </Text>
        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={v => setPin(v.replace(/\D/g, "").slice(0, 6))}
          placeholder="••••••"
          keyboardType="number-pad"
          maxLength={6}
          secureTextEntry
          autoFocus
        />
        {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
        {busy && <ActivityIndicator />}
        <Button title="Upgrade" onPress={() => onSubmit(pin)} disabled={pin.length !== 6 || busy} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 24, gap: 16, justifyContent: "center" },
  title: { fontSize: 26, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 14, opacity: 0.7, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#D1D1D6",
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    textAlign: "center",
    letterSpacing: 12,
    backgroundColor: "#FFFFFF"
  },
  error: { color: "#B00020", fontSize: 13, textAlign: "center" }
})

export default MigrateScreen
