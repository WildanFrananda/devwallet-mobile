import { useState, useEffect, type JSX } from "react"
import { View, Text, StyleSheet } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useViewModel, useStream, useEvent } from "react-native-mobile-mvvm"
import { getContainer } from "react-native-mobile-mvvm/di"
import UnlockViewModel from "../viewmodels/UnlockViewModel"
import EnterPinScreen from "./EnterPinScreen"
import SettingsService from "../core/storage/settings.service"
import PinService from "../core/auth/pin.service"
import { Tokens } from "../core/di/tokens"
import DotGridBackground from "../components/DotGridBackground"
import FadeInView from "../components/FadeInView"
import LockGlyph from "../components/LockGlyph"
import PrimaryButton from "../components/PrimaryButton"
import SecondaryButton from "../components/SecondaryButton"
import { colors, typography, spacing } from "../theme"

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
    <View
      style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      testID="unlock-screen"
    >
      <DotGridBackground />
      <View style={styles.container}>
        <FadeInView fromScale={0.8} translateY={0}>
          <LockGlyph />
        </FadeInView>
        <View style={styles.heading}>
          <Text style={styles.title}>DevWallet</Text>
          <Text style={styles.subtitle}>Wallet is locked.</Text>
        </View>

        {state.status === "error" && <Text style={styles.error}>{state.message}</Text>}

        <PrimaryButton
          testID="unlock.biometric"
          label={state.status === "loading" ? "Unlocking…" : "Unlock with biometric"}
          onPress={() => vm.unlock()}
          loading={state.status === "loading"}
        />

        {hasPin && <SecondaryButton testID="unlock.use-pin" label="Use PIN instead" onPress={() => setMode("pin")} />}
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
  error: { ...typography.bodyMd, color: colors.error, textAlign: "center" }
})

export default UnlockScreen
