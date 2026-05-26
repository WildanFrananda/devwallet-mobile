import { type JSX } from "react"
import { Modal, View, Text, Pressable, FlatList, StyleSheet } from "react-native"
import { NetworkRegistry } from "../core/constants/networks"
import { Chain } from "../core/constants/chains.enum"

type Props = {
  visible: boolean
  selected: Chain | "all"
  onSelect: (chain: Chain | "all") => void
  onClose: () => void
}

type Row = { key: Chain | "all"; label: string }

function NetworkSelector({ visible, selected, onSelect, onClose }: Props): JSX.Element {
  const rows: Row[] = [
    { key: "all", label: "All networks" },
    ...NetworkRegistry.all().map(n => ({ key: n.chain, label: n.name }))
  ]

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Select network</Text>
        <FlatList
          data={rows}
          keyExtractor={row => row.key}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.row, item.key === selected && styles.rowActive]}
              onPress={() => {
                onSelect(item.key)
                onClose()
              }}
            >
              <Text style={styles.rowLabel}>{item.label}</Text>
              {item.key === selected && <Text style={styles.checkmark}>✓</Text>}
            </Pressable>
          )}
        />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "70%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D1D6",
    marginBottom: 12
  },
  title: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 6
  },
  rowActive: { backgroundColor: "#EEF6FB" },
  rowLabel: { fontSize: 15 },
  checkmark: { fontSize: 16, color: "#0A7" }
})

export default NetworkSelector
