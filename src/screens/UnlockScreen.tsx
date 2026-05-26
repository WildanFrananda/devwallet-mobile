import { type JSX } from "react"
import { View, Text, Button, StyleSheet, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useViewModel, useStream, useEvent } from "react-native-mobile-mvvm"
import UnlockViewModel from "../viewmodels/UnlockViewModel"
import BiometricPrompt from "../components/BiometricPrompt"

type Props = {
  onUnlocked: () => void
}

function UnlockScreen({ onUnlocked }: Props): JSX.Element {
  const vm = useViewModel(UnlockViewModel)
  const state = useStream(vm.state$, vm.state$.value)

  useEvent(vm.unlocked$, () => onUnlocked())

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <Text style={styles.title}>DevWallet</Text>
        <Text style={styles.subtitle}>Wallet is locked.</Text>

        <BiometricPrompt message="Use biometric to unlock the wallet." />

        {state.status === "loading" && <ActivityIndicator />}

        {state.status === "error" && <Text style={styles.error}>{state.message}</Text>}

        <Button
          title={state.status === "loading" ? "Unlocking..." : "Unlock"}
          onPress={() => vm.unlock()}
          disabled={state.status === "loading"}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 24, gap: 20, justifyContent: "center" },
  title: { fontSize: 32, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 14, opacity: 0.7, textAlign: "center" },
  error: { color: "#B00020", fontSize: 13, textAlign: "center" }
})

export default UnlockScreen
