import { type JSX } from "react"
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useViewModel, useStream, useEvent } from "react-native-mobile-mvvm"
import EnterPinViewModel from "../viewmodels/EnterPinViewModel"

type Props = {
  onUnlocked: () => void
  onCancel?: () => void
}

function EnterPinScreen({ onUnlocked, onCancel }: Props): JSX.Element {
  const insets = useSafeAreaInsets()
  const vm = useViewModel(EnterPinViewModel)
  const pin = useStream(vm.pin$, vm.pin$.value)
  const state = useStream(vm.state$, vm.state$.value)
  const attemptsLeft = useStream(vm.attemptsLeft$, vm.attemptsLeft$.value)
  const lockoutMs = useStream(vm.lockoutMs$, vm.lockoutMs$.value)

  useEvent(vm.unlocked$, () => onUnlocked())

  const isLocked = lockoutMs > 0
  const errorMessage = state.status === "error" ? state.message : null
  const lockSeconds = Math.ceil(lockoutMs / 1000)

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.container}>
        <Text style={styles.title}>Enter PIN</Text>
        <Text style={styles.subtitle}>6-digit PIN to unlock the wallet.</Text>
        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={v => vm.setPin(v)}
          placeholder="••••••"
          keyboardType="number-pad"
          maxLength={6}
          secureTextEntry
          editable={!isLocked}
          autoFocus
        />
        {isLocked && (
          <Text style={styles.lockout}>Too many wrong attempts. Try again in {lockSeconds}s.</Text>
        )}
        {!isLocked && attemptsLeft < 5 && (
          <Text style={styles.attempts}>{attemptsLeft} attempts left.</Text>
        )}
        {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
        {state.status === "loading" && <ActivityIndicator />}
        <Button
          title={state.status === "loading" ? "Unlocking..." : "Unlock"}
          onPress={() => vm.submit()}
          disabled={state.status === "loading" || isLocked || pin.length !== 6}
        />
        {onCancel && <Button title="Use biometric instead" onPress={onCancel} />}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 24, gap: 16, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center" },
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
  error: { color: "#B00020", fontSize: 13, textAlign: "center" },
  attempts: { color: "#B27800", fontSize: 13, textAlign: "center" },
  lockout: { color: "#B00020", fontSize: 14, textAlign: "center", fontWeight: "600" }
})

export default EnterPinScreen
