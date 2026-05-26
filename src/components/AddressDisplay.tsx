import { type JSX } from "react"
import { View, Text, StyleSheet, Pressable, Alert } from "react-native"
import Clipboard from "@react-native-clipboard/clipboard"
import { truncateAddress } from "../utils/format"

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
      <Pressable onPress={copy}>
        <Text style={styles.address} selectable>
          {truncate ? truncateAddress(address, 10, 8) : address}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { gap: 4 },
  label: { fontSize: 11, opacity: 0.6, fontWeight: "600" },
  address: { fontFamily: "Courier", fontSize: 13, color: "#0066CC" }
})

export default AddressDisplay
