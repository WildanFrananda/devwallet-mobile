import { useState, type JSX } from "react"
import { View, Text, TextInput, StyleSheet } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useDismissKeyboardWhenFilled } from "../hooks/useDismissKeyboardWhenFilled"
import DotGridBackground from "../components/DotGridBackground"
import FadeInView from "../components/FadeInView"
import LockGlyph from "../components/LockGlyph"
import PrimaryButton from "../components/PrimaryButton"
import { colors, typography, spacing, radius, hairline } from "../theme"

type Props = {
  onSubmit: (pin: string) => void
  busy?: boolean
  errorMessage?: string | null
}

function MigrateScreen({ onSubmit, busy, errorMessage }: Props): JSX.Element {
  const insets = useSafeAreaInsets()
  const [pin, setPin] = useState<string>("")

  useDismissKeyboardWhenFilled(pin.length)

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <DotGridBackground />
      <View style={styles.container}>
        <FadeInView fromScale={0.8} translateY={0}>
          <LockGlyph color={colors.accentWarm} />
        </FadeInView>
        <View style={styles.heading}>
          <Text style={styles.title}>Update security</Text>
          <Text style={styles.subtitle}>
            DevWallet now encrypts your recovery phrase with your PIN before storing it. Re-enter your existing 6-digit
            PIN to upgrade.
          </Text>
        </View>

        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={v => setPin(v.replace(/\D/g, "").slice(0, 6))}
          placeholder="••••••"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          maxLength={6}
          secureTextEntry
          autoFocus
        />
        {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

        <PrimaryButton
          label={busy ? "Upgrading…" : "Upgrade"}
          onPress={() => onSubmit(pin)}
          loading={busy}
          disabled={pin.length !== 6}
        />
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
  error: { ...typography.bodyMd, color: colors.error, textAlign: "center" }
})

export default MigrateScreen
