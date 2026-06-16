import { type JSX } from "react"
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useViewModel, useStream, useEvent } from "react-native-mobile-mvvm"
import PinSetupViewModel from "../viewmodels/PinSetupViewModel"

type Props = {
  onDone: () => void
  title?: string
}

function PinSetupScreen({ onDone, title = "Create PIN" }: Props): JSX.Element {
  const insets = useSafeAreaInsets()
  const vm = useViewModel(PinSetupViewModel)
  const stage = useStream(vm.stage$, vm.stage$.value)
  const createValue = useStream(vm.createValue$, vm.createValue$.value)
  const confirmValue = useStream(vm.confirmValue$, vm.confirmValue$.value)
  const save = useStream(vm.save$, vm.save$.value)

  useEvent(vm.saved$, () => onDone())

  const isCreate = stage === "create"
  const value = isCreate ? createValue : confirmValue
  const setValue = isCreate ? (v: string) => vm.setCreateValue(v) : (v: string) => vm.setConfirmValue(v)
  const subtitle = isCreate
    ? "Choose a 6-digit PIN. Used as a fallback when biometric is unavailable."
    : "Re-enter the 6-digit PIN to confirm."
  const onPrimary = isCreate ? () => vm.advanceToConfirm() : () => vm.submit()
  const primaryLabel = isCreate ? "Continue" : "Save PIN"
  const primaryDisabled = save.status === "loading" || value.length !== 6
  const errorMessage = save.status === "error" ? save.message : null

  return (
    <View
      style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      testID={isCreate ? "pin-setup-screen" : "pin-confirm-screen"}
    >
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          placeholder="••••••"
          keyboardType="number-pad"
          maxLength={6}
          secureTextEntry
          autoFocus
          testID={isCreate ? "pin-setup.input" : "pin-confirm.input"}
        />
        {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
        {save.status === "loading" && <ActivityIndicator />}
        <Button
          testID={isCreate ? "pin-setup.continue" : "pin-confirm.continue"}
          title={primaryLabel}
          onPress={onPrimary}
          disabled={primaryDisabled}
        />
        {!isCreate && <Button title="Back" onPress={() => vm.back()} />}
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

export default PinSetupScreen
