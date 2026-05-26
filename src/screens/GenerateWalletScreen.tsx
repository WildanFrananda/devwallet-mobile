import { useState, type JSX } from "react"
import { View, Text, Button, StyleSheet, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import KeyringService from "../core/crypto/keyring/keyring.service"
import Bip39 from "../core/crypto/bip39"
import { Tokens } from "../core/di/tokens"
import DIContainer from "../core/di/container"
import Account from "../models/account.model"

const TEST_MNEMONIC = "test test test test test test test test test test test junk"
const EXPECTED_EVM_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

type RunState = {
  mnemonicValid: boolean
  diResolved: boolean
  accounts: Account[]
  error?: string
}

function GenerateWalletScreen(): JSX.Element {
  const [state, setState] = useState<RunState | null>(null)

  function onRun(): void {
    try {
      const mnemonicValid = Bip39.validate(TEST_MNEMONIC)
      const svc = DIContainer.instance.resolve<KeyringService>(Tokens.KeyringService)
      svc.loadMnemonic(TEST_MNEMONIC)
      const accounts = svc.deriveEvmAll(0)
      setState({ mnemonicValid, diResolved: true, accounts })
    } catch (err) {
      setState({
        mnemonicValid: false,
        diResolved: false,
        accounts: [],
        error: err instanceof Error ? err.message : String(err)
      })
    }
  }

  function rowStatus(label: string, ok: boolean): JSX.Element {
    return (
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={ok ? styles.ok : styles.fail}>{ok ? "PASS ✓" : "FAIL ✗"}</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Phase 1 — Day 2 PoC</Text>
        <Text style={styles.subtitle}>
          Validates BIP39 + BIP44 + KeyringService DI chain on device. Derives 5 EVM accounts from the BIP44 test
          mnemonic; all must match Hardhat account #0.
        </Text>

        <Button title="Run KeyringService PoC" onPress={onRun} />

        {state && (
          <>
            {rowStatus("BIP39 validate", state.mnemonicValid)}
            {rowStatus("DI resolve KeyringService", state.diResolved)}
            {rowStatus(
              "All 5 EVM addresses match expected",
              state.accounts.length === 5 &&
                state.accounts.every(a => a.address.toLowerCase() === EXPECTED_EVM_0.toLowerCase())
            )}

            {state.error && (
              <View style={styles.cardFail}>
                <Text style={styles.label}>Error</Text>
                <Text style={styles.error}>{state.error}</Text>
              </View>
            )}

            {state.accounts.map(a => (
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
