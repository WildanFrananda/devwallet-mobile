import { type JSX } from "react"
import { View, Text, StyleSheet } from "react-native"
import { colors, typography, spacing, radius, hairline } from "../theme"

type Props = {
  words: ReadonlyArray<string>
  highlight?: ReadonlyArray<number>
}

/**
 * 12/24-word recovery phrase. Each cell: mono index + mono word on a flat
 * surface with a hairline border — reads like a numbered code listing.
 * Highlighted cells (verify step) carry a faint indigo accent border.
 */
function MnemonicGrid({ words, highlight = [] }: Props): JSX.Element {
  const highlightSet = new Set(highlight)
  return (
    <View style={styles.grid}>
      {words.map((word, i) => {
        const isHi = highlightSet.has(i)
        return (
          <View key={`${i}-${word}`} style={[styles.cell, isHi && styles.cellHi]}>
            <Text style={styles.index}>{String(i + 1).padStart(2, "0")}</Text>
            <Text style={styles.word}>{word}</Text>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  cell: {
    width: "31%",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: hairline,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  cellHi: {
    borderColor: colors.accent
  },
  index: {
    ...typography.monoDataSm,
    color: colors.textMuted,
    minWidth: 18
  },
  word: {
    ...typography.monoDataMd,
    color: colors.textPrimary
  }
})

export default MnemonicGrid
