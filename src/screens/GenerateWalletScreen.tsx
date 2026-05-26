import { useState, type JSX } from "react"
import { View, Text, Button, StyleSheet, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import SepoliaDerivationPoc from "../poc/derive-sepolia"
import { type PocResult } from "../poc/derive-sepolia"

function GenerateWalletScreen(): JSX.Element {
  const [result, setResult] = useState<PocResult | null>(null)

  function onRun(): void {
    setResult(SepoliaDerivationPoc.run())
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Phase 1 PoC — Risk #2</Text>
        <Text style={styles.subtitle}>
          Derive Hardhat account #0 from BIP44 test mnemonic. Validates react-native-quick-crypto + @scure/bip32 + viem
          on device.
        </Text>

        <Button title="Run PoC: derive Sepolia[0]" onPress={onRun} />

        {result && (
          <View style={[styles.card, result.passed ? styles.cardPass : styles.cardFail]}>
            <Text style={styles.cardTitle}>{result.passed ? "PASS ✓" : "FAIL ✗"}</Text>
            <Text style={styles.label}>Path</Text>
            <Text style={styles.mono}>{result.path}</Text>
            <Text style={styles.label}>Expected</Text>
            <Text style={styles.mono}>{result.expected}</Text>
            <Text style={styles.label}>Derived</Text>
            <Text style={styles.mono}>{result.derived || "(none)"}</Text>
            {result.error && (
              <>
                <Text style={styles.label}>Error</Text>
                <Text style={styles.error}>{result.error}</Text>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 20, gap: 16 },
  title: { fontSize: 22, fontWeight: "600" },
  subtitle: { fontSize: 14, opacity: 0.7 },
  card: { padding: 16, borderRadius: 8, gap: 6 },
  cardPass: { backgroundColor: "#E6F4EA" },
  cardFail: { backgroundColor: "#FCE8E6" },
  cardTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  label: { fontSize: 11, fontWeight: "600", opacity: 0.6, marginTop: 4 },
  mono: { fontFamily: "Courier", fontSize: 12 },
  error: { color: "#B00020", fontSize: 12 }
})

export default GenerateWalletScreen
