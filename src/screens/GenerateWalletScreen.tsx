import { type JSX, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { useScopedViewModel, useStream, useEvent } from "react-native-mobile-mvvm"
import OnboardingViewModel from "../viewmodels/OnboardingViewModel"
import MnemonicGrid from "../components/MnemonicGrid"
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
}>

/**
 * Generate Wallet — shows the freshly derived recovery phrase. Reached from
 * Welcome → "Create wallet", so it auto-generates on mount. Densified to match
 * Verify: blueprint grid, step progress, titled sections, status footer.
 */
function GenerateWalletScreen(): JSX.Element {
  const vm = useScopedViewModel(OnboardingViewModel)
  const nav = useNavigation<OnboardingNav>()
  const mnemonicState = useStream(vm.mnemonic$, vm.mnemonic$.value)

  useEffect(() => {
    if (vm.mnemonic$.value.status === "idle") vm.generate(128)
  }, [vm])

  useEvent(vm.navigate$, event => {
    if (event === "verify") nav.navigate("VerifyMnemonic")
  })

  const wordCount = mnemonicState.status === "success" ? mnemonicState.data.length : 12

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]} testID="generate-wallet-screen">
      <DotGridBackground />
      <ScrollView contentContainerStyle={styles.container}>
        <StepProgress step={1} total={3} label="RECOVERY PHRASE" />

        <View style={styles.heading}>
          <Text style={styles.title}>Your recovery phrase</Text>
          <Text style={styles.subtitle}>
            These words derive every key, on every chain. Write them down offline — anyone with this phrase owns the
            wallet, and it can never be reset.
          </Text>
        </View>

        {(mnemonicState.status === "idle" || mnemonicState.status === "loading") && (
          <Section title="DERIVING">
            <View style={styles.loading}>
              <ActivityIndicator color={colors.accent} />
            </View>
          </Section>
        )}

        {mnemonicState.status === "error" && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{mnemonicState.message}</Text>
          </View>
        )}

        {mnemonicState.status === "success" && (
          <>
            <Section
              title={`RECOVERY PHRASE · ${wordCount} WORDS`}
              trailing={<Text style={styles.tag}>BIP39</Text>}
            >
              <View testID="mnemonic-display">
                <MnemonicGrid words={mnemonicState.data} />
              </View>
            </Section>

            <View style={styles.callout}>
              <View style={styles.calloutDot} />
              <Text style={styles.calloutText}>
                Never screenshot or paste this. DevWallet stores no copy and cannot recover it for you.
              </Text>
            </View>

            <View style={styles.actions}>
              <PrimaryButton testID="mnemonic.continue" label="I've written it down" onPress={() => vm.prepareVerify()} />
              <SecondaryButton label="Regenerate phrase" onPress={() => vm.generate(128)} />
            </View>

            <Text style={styles.footer}>{wordCount} WORDS · DERIVED ON-DEVICE · NEVER SENT</Text>
          </>
        )}
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
  loading: {
    paddingVertical: spacing.xl,
    alignItems: "center"
  },
  callout: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  calloutDot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
    backgroundColor: colors.warning,
    marginTop: 5
  },
  calloutText: {
    ...typography.bodyMd,
    color: colors.textSecondary,
    flex: 1
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
  footer: {
    ...typography.monoLabelSm,
    color: colors.textMuted,
    textAlign: "center"
  }
})

export default GenerateWalletScreen
