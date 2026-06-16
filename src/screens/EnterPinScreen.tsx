import { type JSX } from "react"
import { View, Text, TextInput, StyleSheet } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useViewModel, useStream, useEvent } from "react-native-mobile-mvvm"
import EnterPinViewModel from "../viewmodels/EnterPinViewModel"
import { useDismissKeyboardWhenFilled } from "../hooks/useDismissKeyboardWhenFilled"
import DotGridBackground from "../components/DotGridBackground"
import FadeInView from "../components/FadeInView"
import LockGlyph from "../components/LockGlyph"
import PrimaryButton from "../components/PrimaryButton"
import SecondaryButton from "../components/SecondaryButton"
import { colors, typography, spacing, radius, hairline } from "../theme"

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
  useDismissKeyboardWhenFilled(pin.length)

  const isLocked = lockoutMs > 0
  const errorMessage = state.status === "error" ? state.message : null
  const lockSeconds = Math.ceil(lockoutMs / 1000)

  return (
    <View
      style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      testID="unlock-screen"
    >
      <DotGridBackground />
      <View style={styles.container}>
        <FadeInView fromScale={0.8} translateY={0}>
          <LockGlyph color={isLocked ? colors.error : colors.accent} />
        </FadeInView>
        <View style={styles.heading}>
          <Text style={styles.title}>Enter PIN</Text>
          <Text style={styles.subtitle}>6-digit PIN to unlock the wallet.</Text>
        </View>

        <TextInput
          style={[styles.input, isLocked && styles.inputLocked]}
          value={pin}
          onChangeText={v => vm.setPin(v)}
          placeholder="••••••"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          maxLength={6}
          secureTextEntry
          editable={!isLocked}
          autoFocus
          testID="unlock.pin-input"
        />

        {isLocked && (
          <Text style={styles.lockout}>Too many wrong attempts. Try again in {lockSeconds}s.</Text>
        )}
        {!isLocked && attemptsLeft < 5 && <Text style={styles.attempts}>{attemptsLeft} attempts left.</Text>}
        {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

        <PrimaryButton
          testID="unlock.submit"
          label={state.status === "loading" ? "Unlocking…" : "Unlock"}
          onPress={() => vm.submit()}
          loading={state.status === "loading"}
          disabled={isLocked || pin.length !== 6}
        />
        {onCancel && <SecondaryButton label="Use biometric instead" onPress={onCancel} />}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingHorizontal: spacing.xl, gap: spacing.lg, justifyContent: "center" },
  heading: { gap: spacing.xs, alignItems: "center" },
  title: { ...typography.headlineLg, color: colors.textPrimary, textAlign: "center" },
  subtitle: { ...typography.bodyMd, color: colors.textSecondary, textAlign: "center" },
  input: {
    backgroundColor: colors.elevation1,
    borderWidth: hairline,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    fontSize: 26,
    textAlign: "center",
    letterSpacing: 14,
    color: colors.textPrimary
  },
  inputLocked: { borderColor: colors.error + "66", opacity: 0.6 },
  error: { ...typography.bodyMd, color: colors.error, textAlign: "center" },
  attempts: { ...typography.bodyMd, color: colors.warning, textAlign: "center" },
  lockout: { ...typography.bodyMd, color: colors.error, textAlign: "center", fontWeight: "600" }
})

export default EnterPinScreen
