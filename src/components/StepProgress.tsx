import { type JSX } from "react"
import { View, Text, StyleSheet } from "react-native"
import { colors, typography, spacing, radius } from "../theme"

type Props = {
  step: number
  total: number
  label: string
}

/**
 * Onboarding progress header — a mono eyebrow ("STEP 2 / 3 · CONFIRM PHRASE")
 * over a segmented bar. Segmented (not continuous) reinforces the discrete,
 * technical register. Filled segments use the indigo accent; the rest hairline.
 */
function StepProgress({ step, total, label }: Props): JSX.Element {
  const segments = Array.from({ length: total }, (_, i) => i < step)
  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>
        STEP {step} / {total} · {label}
      </Text>
      <View style={styles.bar}>
        {segments.map((filled, i) => (
          <View key={i} style={[styles.segment, filled ? styles.segmentOn : styles.segmentOff]} />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm
  },
  eyebrow: {
    ...typography.monoLabelSm,
    color: colors.textMuted
  },
  bar: {
    flexDirection: "row",
    gap: spacing.xs
  },
  segment: {
    flex: 1,
    height: 3,
    borderRadius: radius.full
  },
  segmentOn: {
    backgroundColor: colors.accent
  },
  segmentOff: {
    backgroundColor: colors.border
  }
})

export default StepProgress
