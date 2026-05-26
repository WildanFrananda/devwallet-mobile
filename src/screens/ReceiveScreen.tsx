import { type JSX } from "react"
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRoute, type RouteProp } from "@react-navigation/native"
import QRCode from "react-native-qrcode-svg"
import Clipboard from "@react-native-clipboard/clipboard"
import { Chain } from "../core/constants/chains.enum"
import { NetworkRegistry } from "../core/constants/networks"

type AppStackParamList = {
  Receive: { chain: Chain; address: string }
}

function ReceiveScreen(): JSX.Element {
  const route = useRoute<RouteProp<AppStackParamList, "Receive">>()
  const { chain, address } = route.params
  const cfg = NetworkRegistry.get(chain)

  function copy(): void {
    Clipboard.setString(address)
    Alert.alert("Copied", "Address copied to clipboard")
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Receive</Text>
        <Text style={styles.subtitle}>{cfg.name}</Text>

        <View style={styles.qrBox}>
          <QRCode value={address} size={240} backgroundColor="white" />
        </View>

        <View style={styles.addressBox}>
          <Text style={styles.label}>Your address</Text>
          <Text style={styles.address} selectable>
            {address}
          </Text>
          <Pressable style={styles.copyBtn} onPress={copy}>
            <Text style={styles.copyBtnText}>Copy address</Text>
          </Pressable>
        </View>

        <Text style={styles.warning}>
          Only send {cfg.symbol} on {cfg.name} to this address. Sending other assets may result in permanent loss.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 20, gap: 20, alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 14, opacity: 0.6 },
  qrBox: { padding: 16, backgroundColor: "white", borderRadius: 12, borderWidth: 1, borderColor: "#E5E5EA" },
  addressBox: { width: "100%", gap: 8, padding: 14, backgroundColor: "#F2F2F7", borderRadius: 10 },
  label: { fontSize: 11, opacity: 0.6, fontWeight: "600" },
  address: { fontFamily: "Courier", fontSize: 13 },
  copyBtn: { marginTop: 8, padding: 12, backgroundColor: "#EEF6FB", borderRadius: 8, alignItems: "center" },
  copyBtnText: { fontSize: 14, fontWeight: "600", color: "#0066CC" },
  warning: { fontSize: 12, opacity: 0.6, textAlign: "center", padding: 12 }
})

export default ReceiveScreen
