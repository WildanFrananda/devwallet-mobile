import { type JSX } from "react"
import { View, Text, Button, StyleSheet, ScrollView, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useViewModel, useUiState } from "react-native-mobile-mvvm"
import OnboardingViewModel from "../viewmodels/OnboardingViewModel"

function row(label: string, ok: boolean): JSX.Element {
  return (
    <View key={label} style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={ok ? styles.ok : styles.fail}>{ok ? "PASS ✓" : "FAIL ✗"}</Text>
    </View>
  )
}

function GenerateWalletScreen(): JSX.Element {
  const vm = useViewModel(OnboardingViewModel)
  const { data, isLoading, isError, error } = useUiState(vm.report$)

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Phase 1 — Day 4 PoC</Text>
        <Text style={styles.subtitle}>
          ViewModel → KeyringService → 6 derivers. Derives 10 supported chain addresses from the BIP44 test mnemonic.
        </Text>

        <Button title="Run KeyringService PoC" onPress={() => vm.runPoc()} />

        {isLoading && <ActivityIndicator />}

        {isError && (
          <View style={styles.cardFail}>
            <Text style={styles.label}>Error</Text>
            <Text style={styles.error}>{error}</Text>
          </View>
        )}

        {data && (
          <>
            {row("BIP39 validate", data.mnemonicValid)}
            {row("DI resolve KeyringService", data.diResolved)}
            {row("All 5 EVM addresses match expected", data.evmAllMatch)}
            {row("Bitcoin testnet tb1q", data.bitcoinOk)}
            {row("Solana devnet base58", data.solanaOk)}
            {row("Cosmos Hub cosmos1 bech32", data.cosmosOk)}
            {row("XRPL classic r-address", data.xrplOk)}
            {row("StarkNet stark pubkey", data.starknetOk)}

            {data.accounts.map(a => (
              <View key={a.chain} style={styles.account}>
                <Text style={styles.chainName}>{a.chain}</Text>
                <Text style={styles.label}>Path</Text>
                <Text style={styles.mono}>{a.path}</Text>
                <Text style={styles.label}>Address</Text>
                <Text style={styles.mono}>{a.address}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: "600" },
  subtitle: { fontSize: 14, opacity: 0.7 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#F2F2F2",
    borderRadius: 6
  },
  rowLabel: { fontSize: 14 },
  ok: { color: "#0A7", fontWeight: "700" },
  fail: { color: "#B00020", fontWeight: "700" },
  account: { padding: 12, backgroundColor: "#EEF6FB", borderRadius: 8, gap: 4 },
  chainName: { fontSize: 14, fontWeight: "700" },
  cardFail: { padding: 12, backgroundColor: "#FCE8E6", borderRadius: 8 },
  label: { fontSize: 11, fontWeight: "600", opacity: 0.6, marginTop: 4 },
  mono: { fontFamily: "Courier", fontSize: 11 },
  error: { color: "#B00020", fontSize: 12 }
})

export default GenerateWalletScreen
