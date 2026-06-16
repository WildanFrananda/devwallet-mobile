import { type JSX } from "react"
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from "react-native"
import { NetworkRegistry } from "../core/constants/networks"
import { Chain } from "../core/constants/chains.enum"
import { colors, typography, spacing, radius, hairline, chainColors, type ChainColorKey } from "../theme"

type Props = {
  visible: boolean
  selected: Chain | "all"
  onSelect: (chain: Chain | "all") => void
  onClose: () => void
}

/** Short ecosystem tag from the chain id prefix, for the mono metadata line. */
function ecosystem(chain: Chain): string {
  const prefix = String(chain).split(":")[0] ?? ""
  return prefix.toUpperCase()
}

function NetworkSelector({ visible, selected, onSelect, onClose }: Props): JSX.Element {
  const networks = NetworkRegistry.all()

  function pick(key: Chain | "all"): void {
    onSelect(key)
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.title}>SELECT NETWORK</Text>
          <Text style={styles.count}>{networks.length + 1} OPTIONS</Text>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Aggregate option */}
          <Text style={styles.groupLabel}>VIEW</Text>
          <Pressable
            style={[styles.row, selected === "all" && styles.rowActive]}
            onPress={() => pick("all")}
            testID="network-selector.all"
          >
            {selected === "all" && <View style={styles.activeBar} />}
            <View style={styles.allDot} />
            <View style={styles.rowText}>
              <Text style={[styles.rowName, selected === "all" && styles.rowNameActive]}>All networks</Text>
              <Text style={styles.rowMeta}>AGGREGATE · {networks.length} CHAINS</Text>
            </View>
            {selected === "all" && <Text style={styles.check}>✓</Text>}
          </Pressable>

          {/* Per-network */}
          <Text style={[styles.groupLabel, styles.groupLabelSpaced]}>NETWORKS</Text>
          {networks.map((n, i) => {
            const active = n.chain === selected
            const dot = chainColors[n.chain as ChainColorKey] ?? colors.border
            return (
              <View key={n.chain}>
                {i > 0 && <View style={styles.sep} />}
                <Pressable
                  style={[styles.row, active && styles.rowActive]}
                  onPress={() => pick(n.chain)}
                  testID={`network-selector.${n.chain.replace(/:/g, "-")}`}
                >
                  {active && <View style={styles.activeBar} />}
                  <View style={[styles.dot, { backgroundColor: dot }]} />
                  <View style={styles.rowText}>
                    <Text style={[styles.rowName, active && styles.rowNameActive]}>{n.name}</Text>
                    <Text style={styles.rowMeta}>
                      {ecosystem(n.chain)} · {n.symbol} · TESTNET
                    </Text>
                  </View>
                  {active && <Text style={styles.check}>✓</Text>}
                </Pressable>
              </View>
            )
          })}
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)"
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "78%",
    backgroundColor: colors.surface,
    borderTopWidth: hairline,
    borderColor: colors.border,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    marginBottom: spacing.lg
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md
  },
  title: {
    ...typography.monoLabelSm,
    color: colors.textSecondary
  },
  count: {
    ...typography.monoLabelSm,
    color: colors.textMuted
  },
  scroll: {
    flexGrow: 0
  },
  groupLabel: {
    ...typography.monoLabelSm,
    color: colors.textMuted,
    marginBottom: spacing.sm
  },
  groupLabelSpaced: {
    marginTop: spacing.lg
  },
  sep: {
    height: hairline,
    backgroundColor: colors.border,
    marginLeft: spacing.xl
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm
  },
  rowActive: {
    backgroundColor: colors.surfaceInteractive
  },
  activeBar: {
    position: "absolute",
    left: 0,
    top: spacing.sm,
    bottom: spacing.sm,
    width: 2,
    borderRadius: radius.full,
    backgroundColor: colors.accent
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.full
  },
  allDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    borderWidth: hairline,
    borderColor: colors.borderStrong
  },
  rowText: {
    flex: 1,
    gap: 2
  },
  rowName: {
    ...typography.bodyLg,
    color: colors.textSecondary
  },
  rowNameActive: {
    color: colors.textPrimary,
    fontWeight: "600"
  },
  rowMeta: {
    ...typography.monoLabelSm,
    color: colors.textMuted
  },
  check: {
    ...typography.bodyLg,
    color: colors.accent
  }
})

export default NetworkSelector
