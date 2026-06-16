import { type JSX, useState } from "react"
import { View, Text, TextInput, StyleSheet, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { useScopedViewModel, useStream, useEvent } from "react-native-mobile-mvvm"
import OnboardingViewModel from "../viewmodels/OnboardingViewModel"
import PrimaryButton from "../components/PrimaryButton"
import SecondaryButton from "../components/SecondaryButton"
import StepProgress from "../components/StepProgress"
import Section from "../components/Section"
import DotGridBackground from "../components/DotGridBackground"
import { colors, typography, spacing, radius, hairline } from "../theme"

type OnboardingNav = NativeStackNavigationProp<{
  GenerateWallet: undefined
  RestoreWallet: undefined
  VerifyMnemonic: undefined
  CreatePin: undefined
}>

const norm = (s: string): string => s.trim().toLowerCase()

function VerifyMnemonicScreen(): JSX.Element {
  const vm = useScopedViewModel(OnboardingViewModel)
  const nav = useNavigation<OnboardingNav>()
  const challenge = useStream(vm.verify$, vm.verify$.value)
  const answers = useStream(vm.verifyAnswers$, vm.verifyAnswers$.value)
  const persist = useStream(vm.persist$, vm.persist$.value)
  const [focused, setFocused] = useState<number | null>(null)

  useEvent(vm.navigate$, event => {
    if (event === "createPin") nav.navigate("CreatePin")
  })

  if (!challenge) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <DotGridBackground />
        <View style={styles.center}>
          <Text style={styles.subtitle}>No verification challenge active. Go back and generate a phrase first.</Text>
        </View>
      </SafeAreaView>
    )
  }

  const matched = challenge.indices.map((_, slot) => {
    const a = answers[slot] ?? ""
    return a.length > 0 && norm(a) === norm(challenge.expected[slot] ?? "")
  })
  const matchCount = matched.filter(Boolean).length
  const total = challenge.indices.length

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <DotGridBackground />
      <ScrollView contentContainerStyle={styles.container}>
        <StepProgress step={2} total={3} label="CONFIRM PHRASE" />

        <View style={styles.heading}>
          <Text style={styles.title}>Confirm your phrase</Text>
          <Text style={styles.subtitle}>Enter the word at each position to prove you wrote the phrase down.</Text>
        </View>

        <Section
          title="PHRASE CHECK"
          trailing={
            <Text style={[styles.counter, matchCount === total && styles.counterDone]}>
              {matchCount} / {total} MATCHED
            </Text>
          }
        >
          {challenge.indices.map((wordIndex, slot) => {
            const ok = matched[slot]
            const isFocused = focused === slot
            return (
              <View key={wordIndex} style={styles.row}>
                <Text style={styles.posLabel}>#{String(wordIndex + 1).padStart(2, "0")}</Text>
                <TextInput
                  style={[styles.input, isFocused && styles.inputFocused, ok && styles.inputOk]}
                  value={answers[slot] ?? ""}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  onFocus={() => setFocused(slot)}
                  onBlur={() => setFocused(null)}
                  onChangeText={text => vm.setVerifyAnswer(slot, text)}
                  placeholder="word"
                  placeholderTextColor={colors.textMuted}
                  testID={`verify-mnemonic.input.${slot}`}
                />
                <Text style={[styles.check, ok && styles.checkOk]}>{ok ? "✓" : "·"}</Text>
              </View>
            )
          })}
        </Section>

        <Section title="WHY THIS STEP">
          <Text style={styles.note}>
            DevWallet keeps no copy of your phrase. This check confirms you saved it before any funds touch the wallet —
            there is no reset or recovery without it.
          </Text>
        </Section>

        {persist.status === "error" && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{persist.message}</Text>
          </View>
        )}

        {persist.status === "success" && (
          <Section title="WALLET READY" trailing={<View style={styles.successDot} />}>
            <Text style={styles.posLabelInline}>PRIMARY EVM ADDRESS</Text>
            <Text style={styles.mono}>{persist.data.address}</Text>
          </Section>
        )}

        <View style={styles.actions}>
          <PrimaryButton
            testID="verify-mnemonic.submit"
            label="Verify and continue"
            onPress={() => vm.submitVerify()}
            loading={persist.status === "loading"}
          />
          {__DEV__ && (
            <SecondaryButton
              testID="verify-mnemonic.dev-skip"
              label="(dev) auto-fill + verify"
              onPress={() => {
                challenge.expected.forEach((word, slot) => vm.setVerifyAnswer(slot, word))
                vm.submitVerify()
              }}
            />
          )}
        </View>

        <Text style={styles.footer}>{matchCount} OF {total} MATCHED · KEYS ON-DEVICE · NON-CUSTODIAL</Text>
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg
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
  counter: {
    ...typography.monoLabelSm,
    color: colors.textMuted
  },
  counterDone: {
    color: colors.success
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  posLabel: {
    ...typography.monoDataSm,
    color: colors.textMuted,
    width: 28
  },
  posLabelInline: {
    ...typography.monoLabelSm,
    color: colors.textMuted
  },
  input: {
    ...typography.monoDataMd,
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
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
  check: {
    ...typography.monoDataMd,
    width: 16,
    textAlign: "center",
    color: colors.textMuted
  },
  checkOk: {
    color: colors.success
  },
  note: {
    ...typography.bodyMd,
    color: colors.textSecondary
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

export default VerifyMnemonicScreen
