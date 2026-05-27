import { type JSX } from "react"
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useViewModel, useStream, useEvent } from "react-native-mobile-mvvm"
import ChangePinViewModel from "../viewmodels/ChangePinViewModel"

type Props = {
  onDone: () => void
  onCancel: () => void
}

function ChangePinScreen({ onDone, onCancel }: Props): JSX.Element {
  const insets = useSafeAreaInsets()
  const vm = useViewModel(ChangePinViewModel)
  const stage = useStream(vm.stage$, vm.stage$.value)
  const currentPin = useStream(vm.currentPin$, vm.currentPin$.value)
  const newPin = useStream(vm.newPin$, vm.newPin$.value)
  const confirmPin = useStream(vm.confirmPin$, vm.confirmPin$.value)
  const save = useStream(vm.save$, vm.save$.value)

  useEvent(vm.saved$, () => onDone())

  const value =
    stage === "current" ? currentPin : stage === "new" ? newPin : confirmPin
  const setValue =
    stage === "current"
      ? (v: string) => vm.setCurrentPin(v)
      : stage === "new"
        ? (v: string) => vm.setNewPin(v)
        : (v: string) => vm.setConfirmPin(v)
  const titleText =
    stage === "current"
      ? "Enter current PIN"
      : stage === "new"
        ? "Choose a new PIN"
        : "Confirm new PIN"
  const subtitleText =
    stage === "current"
      ? "Verify it's you before changing the PIN."
      : stage === "new"
        ? "6 digits. Must differ from your current PIN."
        : "Re-enter the new PIN to confirm."
  const primaryLabel = stage === "confirm" ? "Save PIN" : "Continue"
  const errorMessage = save.status === "error" ? save.message : null
  const primaryDisabled = save.status === "loading" || value.length !== 6

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.container}>
        <Text style={styles.title}>{titleText}</Text>
        <Text style={styles.subtitle}>{subtitleText}</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          placeholder="••••••"
          keyboardType="number-pad"
          maxLength={6}
          secureTextEntry
          autoFocus
        />
        {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
        {save.status === "loading" && <ActivityIndicator />}
        <Button title={primaryLabel} onPress={() => vm.advance()} disabled={primaryDisabled} />
        {stage !== "current" && <Button title="Back" onPress={() => vm.back()} />}
        <Button title="Cancel" onPress={onCancel} />
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
  error: { color: "#B00020", fontSize: 13, textAlign: "center" }
})

export default ChangePinScreen
