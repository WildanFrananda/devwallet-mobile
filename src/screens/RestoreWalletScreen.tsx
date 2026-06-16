import { type JSX, useState } from "react"
import { View, Text, TextInput, StyleSheet, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { useScopedViewModel, useStream, useEvent } from "react-native-mobile-mvvm"
import OnboardingViewModel from "../viewmodels/OnboardingViewModel"
import PrimaryButton from "../components/PrimaryButton"
import Section from "../components/Section"
import DotGridBackground from "../components/DotGridBackground"
import { colors, typography, spacing, radius, hairline } from "../theme"

type OnboardingNav = NativeStackNavigationProp<{
  GenerateWallet: undefined
  RestoreWallet: undefined
  VerifyMnemonic: undefined
  CreatePin: undefined
}>

function RestoreWalletScreen(): JSX.Element {
  const vm = useScopedViewModel(OnboardingViewModel)
  const nav = useNavigation<OnboardingNav>()
  const phrase = useStream(vm.restoreInput$, vm.restoreInput$.value)
  const wordCount = useStream(vm.restoreWordCount$, vm.restoreWordCount$.value)
  const valid = useStream(vm.restoreValid$, vm.restoreValid$.value)
  const persist = useStream(vm.persist$, vm.persist$.value)
  const [focused, setFocused] = useState(false)

  useEvent(vm.navigate$, event => {
    if (event === "createPin") nav.navigate("CreatePin")
  })

  const canSubmit = valid && persist.status !== "loading"
  const target = wordCount <= 12 ? 12 : 24
  const slots = Array.from({ length: target }, (_, i) => i < wordCount)
  const countNote = wordCount === 0 ? "AWAITING INPUT" : valid ? "VALID LENGTH" : `NEED 12 OR 24 · HAVE ${wordCount}`

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]} testID="restore-screen">
      <DotGridBackground />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>RESTORE · BIP39 PHRASE</Text>
        <View style={styles.heading}>
          <Text style={styles.title}>Restore your wallet</Text>
          <Text style={styles.subtitle}>
            Paste or type your 12- or 24-word recovery phrase, separated by spaces. It is processed on-device and never
            sent anywhere.
          </Text>
        </View>

        <Section
          title="RECOVERY PHRASE"
          trailing={
            <Text style={[styles.tag, valid && styles.tagOk]}>
              {wordCount} / {target}
            </Text>
          }
        >
          <TextInput
            testID="restore.mnemonic-input"
            style={[styles.input, focused && styles.inputFocused, valid && styles.inputOk]}
            value={phrase}
            onChangeText={vm.setRestoreInput.bind(vm)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="word1 word2 word3 …"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            multiline
            textAlignVertical="top"
          />
          <View style={styles.slotRow}>
            {slots.map((filled, i) => (
              <View key={i} style={[styles.slot, filled ? styles.slotOn : styles.slotOff]} />
            ))}
          </View>
          <Text style={[styles.countNote, valid && styles.countNoteOk]}>{countNote}</Text>
        </Section>

        {persist.status === "error" && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{persist.message}</Text>
          </View>
        )}

        {persist.status === "success" && (
          <Section title="WALLET RESTORED" trailing={<View style={styles.successDot} />}>
            <Text style={styles.fieldLabel}>PRIMARY EVM ADDRESS</Text>
            <Text style={styles.mono}>{persist.data.address}</Text>
          </Section>
        )}

        <View style={styles.actions}>
          <PrimaryButton
            testID="restore.continue"
            label="Restore wallet"
            onPress={() => vm.submitRestore()}
            disabled={!canSubmit}
            loading={persist.status === "loading"}
          />
        </View>

        <Text style={styles.footer}>PROCESSED ON-DEVICE · PHRASE NEVER SENT · NON-CUSTODIAL</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.xl
  },
  eyebrow: {
    ...typography.monoLabelSm,
    color: colors.textMuted
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
  tagOk: {
    color: colors.success
  },
  input: {
    ...typography.monoDataMd,
    color: colors.textPrimary,
    minHeight: 96,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    borderWidth: hairline,
    borderColor: colors.border
  },
  inputFocused: {
    borderColor: colors.accent
  },
  inputOk: {
    borderColor: colors.success
  },
  slotRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  slot: {
    width: 14,
    height: 3,
    borderRadius: radius.full
  },
  slotOn: {
    backgroundColor: colors.accent
  },
  slotOff: {
    backgroundColor: colors.border
  },
  countNote: {
    ...typography.monoLabelSm,
    color: colors.textMuted
  },
  countNoteOk: {
    color: colors.success
  },
  fieldLabel: {
    ...typography.monoLabelSm,
    color: colors.textMuted
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
    color: colors.error
  },
  successDot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
    backgroundColor: colors.success
  },
  mono: {
    ...typography.monoDataSm,
    color: colors.textSecondary
  },
  footer: {
    ...typography.monoLabelSm,
    color: colors.textMuted,
    textAlign: "center"
  }
})

export default RestoreWalletScreen
