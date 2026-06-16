import { type JSX } from "react"
import { View, Text, StyleSheet, Pressable, Alert } from "react-native"
import Clipboard from "@react-native-clipboard/clipboard"
import { truncateAddress } from "../utils/format"
import { colors, typography, spacing, radius, hairline } from "../theme"

type Props = {
  address: string
  truncate?: boolean
  label?: string
}

function AddressDisplay({ address, truncate = true, label }: Props): JSX.Element {
  function copy(): void {
    Clipboard.setString(address)
    Alert.alert("Copied", "Address copied to clipboard")
  }

  return (
    <View style={styles.row}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable style={styles.chip} onPress={copy}>
        <Text style={styles.address} selectable>
          {truncate ? truncateAddress(address, 10, 8) : address}
        </Text>
        <Text style={styles.copy}>COPY</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.xs
  },
  label: {
    ...typography.monoLabelSm,
    textTransform: "uppercase",
    color: colors.textMuted
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: hairline,
    borderColor: colors.border
  },
  address: {
    ...typography.monoDataSm,
    color: colors.textSecondary,
    flex: 1
  },
  copy: {
    ...typography.monoLabelSm,
    color: colors.accentText,
    marginLeft: spacing.sm
  }
})

export default AddressDisplay
