import { useState, useEffect, type JSX } from "react"
import { View, Text, Button, StyleSheet, ActivityIndicator } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useViewModel, useStream, useEvent } from "react-native-mobile-mvvm"
import { getContainer } from "react-native-mobile-mvvm/di"
import UnlockViewModel from "../viewmodels/UnlockViewModel"
import EnterPinScreen from "./EnterPinScreen"
import SettingsService from "../core/storage/settings.service"
import PinService from "../core/auth/pin.service"
import { Tokens } from "../core/di/tokens"

type Props = {
  onUnlocked: () => void
}

function UnlockScreen({ onUnlocked }: Props): JSX.Element {
  const insets = useSafeAreaInsets()
  const vm = useViewModel(UnlockViewModel)
  const state = useStream(vm.state$, vm.state$.value)

  const settings = getContainer.resolve<SettingsService>(Tokens.Settings)
  const pinService = getContainer.resolve<PinService>(Tokens.Pin)
  const useBiometric = settings.getUseBiometric()
  const [hasPin, setHasPin] = useState<boolean>(false)
  const [mode, setMode] = useState<"biometric" | "pin">(useBiometric ? "biometric" : "pin")

  useEffect(() => {
    void pinService.hasPin().then(setHasPin)
  }, [pinService])

  useEvent(vm.unlocked$, () => onUnlocked())

  if (mode === "pin" && hasPin) {
    return <EnterPinScreen onUnlocked={onUnlocked} onCancel={useBiometric ? () => setMode("biometric") : undefined} />
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.container}>
        <Text style={styles.title}>DevWallet</Text>
        <Text style={styles.subtitle}>Wallet is locked.</Text>

        {state.status === "loading" && <ActivityIndicator />}

        {state.status === "error" && <Text style={styles.error}>{state.message}</Text>}

        <Button
          title={state.status === "loading" ? "Unlocking..." : "Unlock with biometric"}
          onPress={() => vm.unlock()}
          disabled={state.status === "loading"}
        />

        {hasPin && <Button title="Use PIN instead" onPress={() => setMode("pin")} />}
      </View>
    </View>
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
