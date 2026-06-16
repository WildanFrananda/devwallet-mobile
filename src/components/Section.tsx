import { type JSX, type ReactNode } from "react"
import { View, Text, StyleSheet } from "react-native"
import { colors, typography, spacing, radius, hairline } from "../theme"

type Props = {
  title: string
  children: ReactNode
  trailing?: ReactNode
  /** Marks the screen's ONE hero section — adds an indigo focal left-border. */
  primary?: boolean
}

/**
 * A titled content island — sans eyebrow header (optionally with a trailing
 * status node) over a tonally-elevated card. Groups related fields into
 * "islands". Set `primary` on exactly one section per screen for a focal point.
 */
function Section({ title, children, trailing, primary = false }: Props): JSX.Element {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {trailing}
      </View>
      <View style={[styles.body, primary && styles.bodyPrimary]}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  title: {
    ...typography.labelXs,
    color: colors.textMuted
  },
  body: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: hairline,
    borderColor: colors.border,
    backgroundColor: colors.elevation1,
    gap: spacing.md
  },
  bodyPrimary: {
    borderLeftWidth: 2,
    borderLeftColor: colors.accent
  }
})

export default Section
