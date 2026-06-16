import { type JSX, useRef } from "react"
import { View, Text, TextInput, StyleSheet, Pressable } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useViewModel, useStream, useEvent } from "react-native-mobile-mvvm"
import ChangePinViewModel from "../viewmodels/ChangePinViewModel"
import { useDismissKeyboardWhenFilled } from "../hooks/useDismissKeyboardWhenFilled"
import PrimaryButton from "../components/PrimaryButton"
import SecondaryButton from "../components/SecondaryButton"
import StepProgress from "../components/StepProgress"
import Section from "../components/Section"
import DotGridBackground from "../components/DotGridBackground"
import { colors, typography, spacing, radius, hairline } from "../theme"

type Props = {
  onDone: () => void
  onCancel: () => void
}

const PIN_LENGTH = 6

function ChangePinScreen({ onDone, onCancel }: Props): JSX.Element {
  const insets = useSafeAreaInsets()
  const vm = useViewModel(ChangePinViewModel)
  const stage = useStream(vm.stage$, vm.stage$.value)
  const currentPin = useStream(vm.currentPin$, vm.currentPin$.value)
  const newPin = useStream(vm.newPin$, vm.newPin$.value)
  const confirmPin = useStream(vm.confirmPin$, vm.confirmPin$.value)
  const save = useStream(vm.save$, vm.save$.value)
  const inputRef = useRef<TextInput>(null)

  useEvent(vm.saved$, () => onDone())

  const value = stage === "current" ? currentPin : stage === "new" ? newPin : confirmPin
  useDismissKeyboardWhenFilled(value.length)

  const setValue =
    stage === "current"
      ? (v: string) => vm.setCurrentPin(v)
      : stage === "new"
        ? (v: string) => vm.setNewPin(v)
        : (v: string) => vm.setConfirmPin(v)
  const step = stage === "current" ? 1 : stage === "new" ? 2 : 3
  const stepLabel = stage === "current" ? "VERIFY CURRENT" : stage === "new" ? "NEW PIN" : "CONFIRM PIN"
  const titleText = stage === "current" ? "Enter current PIN" : stage === "new" ? "Choose a new PIN" : "Confirm new PIN"
  const subtitleText =
    stage === "current"
      ? "Verify it's you before changing the PIN."
      : stage === "new"
        ? "Six digits. Must differ from your current PIN."
        : "Re-enter the new PIN to confirm."
  const primaryLabel = stage === "confirm" ? "Save PIN" : "Continue"
  const errorMessage = save.status === "error" ? save.message : null
  const primaryDisabled = save.status === "loading" || value.length !== PIN_LENGTH
  const dots = Array.from({ length: PIN_LENGTH }, (_, i) => i < value.length)

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]} testID="change-pin-screen">
      <DotGridBackground />
      <View style={styles.container}>
        <View style={styles.top}>
          <StepProgress step={step} total={3} label={stepLabel} />
          <View style={styles.heading}>
            <Text style={styles.title}>{titleText}</Text>
            <Text style={styles.subtitle}>{subtitleText}</Text>
          </View>

          <Section
            title={stepLabel}
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
            />
          </Section>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            label={primaryLabel}
            onPress={() => vm.advance()}
            disabled={primaryDisabled}
            loading={save.status === "loading"}
          />
          {stage !== "current" && <SecondaryButton label="Back" onPress={() => vm.back()} />}
          <Pressable style={styles.cancel} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
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
  actions: {
    gap: spacing.sm
  },
  cancel: {
    alignItems: "center",
    paddingVertical: spacing.sm
  },
  cancelText: {
    ...typography.monoLabelSm,
    color: colors.textMuted
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
  }
})

export default ChangePinScreen
