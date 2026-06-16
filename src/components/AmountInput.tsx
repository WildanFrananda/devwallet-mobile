import { type JSX, useState } from "react"
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native"
import { colors, typography, spacing, radius, hairline } from "../theme"

type Props = {
  value: string
  symbol: string
  onChange: (next: string) => void
  placeholder?: string
  label?: string
  onMaxPress?: () => void
  maxLoading?: boolean
  testID?: string
}

function AmountInput({
  value,
  symbol,
  onChange,
  placeholder = "0.0",
  label,
  onMaxPress,
  maxLoading,
  testID
}: Props): JSX.Element {
  const [focused, setFocused] = useState(false)
  return (
    <View style={styles.field}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputRow, focused && styles.inputRowFocused]}>
        <TextInput
          testID={testID}
          style={styles.input}
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {onMaxPress && (
          <Pressable style={styles.maxBtn} onPress={onMaxPress} disabled={maxLoading}>
            {maxLoading ? (
              <ActivityIndicator size="small" color={colors.accentText} />
            ) : (
              <Text style={styles.maxLabel}>MAX</Text>
            )}
          </Pressable>
        )}
        <Text style={styles.symbol}>{symbol}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs
  },
  label: {
    ...typography.monoLabelSm,
    textTransform: "uppercase",
    color: colors.textMuted
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: hairline,
    borderColor: colors.border,
    paddingRight: spacing.md
  },
  inputRowFocused: {
    borderColor: colors.accent
  },
  input: {
    // Proportional font + letterSpacing 0 — monospace made the placeholder read
    // as stretched. Amounts are digits, render fine in the system font.
    fontSize: 18,
    letterSpacing: 0,
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md
  },
  maxBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: hairline,
    borderColor: colors.accent,
    marginRight: spacing.sm
  },
  maxLabel: {
    ...typography.monoLabelSm,
    color: colors.accentText
  },
  symbol: {
    ...typography.monoLabelSm,
    color: colors.textSecondary
  }
})

export default AmountInput
