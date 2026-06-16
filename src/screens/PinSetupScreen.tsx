import { type JSX, useRef } from "react"
import { View, Text, TextInput, StyleSheet, Pressable } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useViewModel, useStream, useEvent } from "react-native-mobile-mvvm"
import PinSetupViewModel from "../viewmodels/PinSetupViewModel"
import { useDismissKeyboardWhenFilled } from "../hooks/useDismissKeyboardWhenFilled"
import PrimaryButton from "../components/PrimaryButton"
import SecondaryButton from "../components/SecondaryButton"
import StepProgress from "../components/StepProgress"
import Section from "../components/Section"
import DotGridBackground from "../components/DotGridBackground"
import { colors, typography, spacing, radius, hairline } from "../theme"

type Props = {
  onDone: () => void
  title?: string
}

const PIN_LENGTH = 6

function PinSetupScreen({ onDone, title = "Secure with a PIN" }: Props): JSX.Element {
  const insets = useSafeAreaInsets()
  const vm = useViewModel(PinSetupViewModel)
  const stage = useStream(vm.stage$, vm.stage$.value)
  const createValue = useStream(vm.createValue$, vm.createValue$.value)
  const confirmValue = useStream(vm.confirmValue$, vm.confirmValue$.value)
  const save = useStream(vm.save$, vm.save$.value)
  const inputRef = useRef<TextInput>(null)

  useEvent(vm.saved$, () => onDone())

  const isCreate = stage === "create"
  const value = isCreate ? createValue : confirmValue
  const setValue = isCreate ? (v: string) => vm.setCreateValue(v) : (v: string) => vm.setConfirmValue(v)
  const subtitle = isCreate
    ? "Six digits, used as a fallback when biometrics are unavailable. Never leaves the device."
    : "Re-enter the same six digits to confirm."
  const onPrimary = isCreate ? () => vm.advanceToConfirm() : () => vm.submit()
  const primaryLabel = isCreate ? "Continue" : "Save PIN"
  const primaryDisabled = save.status === "loading" || value.length !== PIN_LENGTH
  const errorMessage = save.status === "error" ? save.message : null
  const dots = Array.from({ length: PIN_LENGTH }, (_, i) => i < value.length)

  // Drop the keyboard once full — tapping the PIN dots re-focuses to edit.
  useDismissKeyboardWhenFilled(value.length, PIN_LENGTH)

  return (
    <View
      style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      testID={isCreate ? "pin-setup-screen" : "pin-confirm-screen"}
    >
      <DotGridBackground />
      <View style={styles.container}>
        <View style={styles.top}>
          <StepProgress step={3} total={3} label={isCreate ? "SET PIN" : "CONFIRM PIN"} />
          <View style={styles.heading}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <Section
            title={isCreate ? "ENTER PIN" : "CONFIRM PIN"}
            trailing={
              <Text style={styles.tag}>
                {value.length} / {PIN_LENGTH}
              </Text>
            }
          >
            <Pressable style={styles.dotRow} onPress={() => inputRef.current?.focus()}>
              {dots.map((filled, i) => (
                <View key={i} style={[styles.pinDot, filled ? styles.pinDotOn : styles.pinDotOff]} />
              ))}
            </Pressable>
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              value={value}
              onChangeText={setValue}
              keyboardType="number-pad"
              maxLength={PIN_LENGTH}
              secureTextEntry
              caretHidden
              autoFocus
              testID={isCreate ? "pin-setup.input" : "pin-confirm.input"}
            />
            <Text style={styles.hint}>6-DIGIT · PBKDF2 · STORED IN KEYCHAIN</Text>
          </Section>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            testID={isCreate ? "pin-setup.continue" : "pin-confirm.continue"}
            label={primaryLabel}
            onPress={onPrimary}
            disabled={primaryDisabled}
            loading={save.status === "loading"}
          />
          {!isCreate && <SecondaryButton label="Back" onPress={() => vm.back()} />}
          <Text style={styles.footer}>NON-CUSTODIAL · PIN NEVER SENT · DEVICE-ONLY</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    justifyContent: "space-between"
  },
  top: {
    gap: spacing.xl
  },
  heading: {
    gap: spacing.sm
  },
  title: {
    ...typography.headlineMd,
    color: colors.textPrimary
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.textSecondary
  },
  tag: {
    ...typography.monoLabelSm,
    color: colors.textMuted
  },
  dotRow: {
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "center",
    paddingVertical: spacing.md
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: radius.full,
    borderWidth: hairline
  },
  pinDotOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent
  },
  pinDotOff: {
    backgroundColor: colors.transparent,
    borderColor: colors.border
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    height: 1,
    width: 1
  },
  hint: {
    ...typography.monoLabelSm,
    color: colors.textMuted,
    textAlign: "center"
  },
  actions: {
    gap: spacing.sm
  },
  errorBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: hairline,
    borderColor: colors.error,
    backgroundColor: colors.surface
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    textAlign: "center"
  },
  footer: {
    ...typography.monoLabelSm,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm
  }
})

export default PinSetupScreen
