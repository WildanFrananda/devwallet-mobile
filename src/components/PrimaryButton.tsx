import { type JSX, useRef } from "react"
import { Pressable, Text, StyleSheet, ActivityIndicator, Animated, type ViewStyle } from "react-native"
import { colors, typography, radius, spacing, duration, easing, spring } from "../theme"

type Props = {
  label: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  testID?: string
  style?: ViewStyle
}

/**
 * The single indigo fill allowed per screen — and the one button allowed to
 * glow. Press = spring to 0.96 scale + indigo focal glow ramps in; release
 * eases back. Single-accent rule baked in (no "secondary filled" variant).
 */
function PrimaryButton({ label, onPress, disabled, loading, testID, style }: Props): JSX.Element {
  const isOff = disabled || loading
  const scale = useRef(new Animated.Value(1)).current
  const glow = useRef(new Animated.Value(0)).current

  const pressIn = (): void => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.96, ...spring, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 1, duration: duration.quick, easing: easing.out, useNativeDriver: true })
    ]).start()
  }
  const pressOut = (): void => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, ...spring, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: duration.normal, easing: easing.out, useNativeDriver: true })
    ]).start()
  }

  return (
    <Animated.View
      style={[
        styles.glowWrap,
        { transform: [{ scale }], shadowOpacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.16] }) }
      ]}
    >
      <Pressable
        testID={testID}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={isOff}
        style={[styles.base, isOff && styles.disabled, style]}
      >
        {loading ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.label}>{label}</Text>}
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  glowWrap: {
    borderRadius: radius.md,
    shadowColor: colors.accent,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 0
  },
  base: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  disabled: {
    opacity: 0.4
  },
  label: {
    ...typography.bodyLg,
    fontWeight: "600",
    color: colors.onAccent
  }
})

export default PrimaryButton
