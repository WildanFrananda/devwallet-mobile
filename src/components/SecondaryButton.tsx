import { type JSX } from "react"
import { Pressable, Text, StyleSheet, type ViewStyle } from "react-native"
import { colors, typography, radius, spacing, hairline } from "../theme"

type Props = {
  label: string
  onPress: () => void
  disabled?: boolean
  testID?: string
  style?: ViewStyle
}

/**
 * Hairline-outline action. Carries no chromatic weight — keeps the indigo
 * fill (PrimaryButton) as the only accent on screen. Pressed = surface tint.
 */
function SecondaryButton({ label, onPress, disabled, testID, style }: Props): JSX.Element {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: hairline,
    borderColor: colors.border,
    backgroundColor: colors.transparent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  pressed: {
    backgroundColor: colors.surfaceInteractive
  },
  disabled: {
    opacity: 0.4
  },
  label: {
    ...typography.bodyLg,
    color: colors.textPrimary
  }
})

export default SecondaryButton
