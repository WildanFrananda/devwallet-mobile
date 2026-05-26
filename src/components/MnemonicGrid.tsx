import { type JSX } from "react"
import { View, Text, StyleSheet } from "react-native"

type Props = {
  words: ReadonlyArray<string>
  highlight?: ReadonlyArray<number>
}

function MnemonicGrid({ words, highlight = [] }: Props): JSX.Element {
  const highlightSet = new Set(highlight)
  return (
    <View style={styles.grid}>
      {words.map((word, i) => {
        const isHi = highlightSet.has(i)
        return (
          <View key={`${i}-${word}`} style={[styles.cell, isHi && styles.cellHi]}>
            <Text style={styles.index}>{i + 1}</Text>
            <Text style={styles.word}>{word}</Text>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cell: {
    width: "30%",
    padding: 10,
    backgroundColor: "#F2F2F7",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  cellHi: { backgroundColor: "#FFE08A" },
  index: { fontSize: 11, opacity: 0.5, fontVariant: ["tabular-nums"], minWidth: 18 },
  word: { fontSize: 14, fontWeight: "500" }
})

export default MnemonicGrid
