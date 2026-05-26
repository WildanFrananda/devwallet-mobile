import { type JSX } from "react"
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Linking
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRoute, type RouteProp } from "@react-navigation/native"
import { useViewModel, useStream, useInit } from "react-native-mobile-mvvm"
import SendViewModel from "../viewmodels/SendViewModel"
import { Chain } from "../core/constants/chains.enum"
import { NetworkRegistry } from "../core/constants/networks"
import { truncateAddress } from "../utils/format"

type AppStackParamList = {
  Send: { chain: Chain; fromAddress: string }
}

function SendScreen(): JSX.Element {
  const vm = useViewModel(SendViewModel)
  const route = useRoute<RouteProp<AppStackParamList, "Send">>()
  const { chain, fromAddress } = route.params
  const recipient = useStream(vm.recipient$, vm.recipient$.value)
  const amount = useStream(vm.amount$, vm.amount$.value)
  const state = useStream(vm.state$, vm.state$.value)
  const canSubmit = useStream(vm.canSubmit$, vm.canSubmit$.value)
  const cfg = NetworkRegistry.get(chain)

  useInit(() => vm.bind(chain, fromAddress))

  const explorerUrl =
    state.status === "success" && cfg.explorerUrl ? `${cfg.explorerUrl}/tx/${state.data.hash}` : null

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Send</Text>
        <Text style={styles.subtitle}>
          {cfg.name} · From {truncateAddress(fromAddress)}
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Recipient address</Text>
          <TextInput
            style={styles.input}
            value={recipient}
            onChangeText={vm.setRecipient.bind(vm)}
            placeholder="0x..."
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Amount ({cfg.symbol})</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={vm.setAmount.bind(vm)}
            placeholder="0.0"
            keyboardType="decimal-pad"
          />
        </View>

        {state.status === "loading" && (
          <View style={styles.statusBox}>
            <ActivityIndicator />
            <Text style={styles.body}>Signing + broadcasting...</Text>
          </View>
        )}

        {state.status === "error" && <Text style={styles.error}>{state.message}</Text>}

        {state.status === "success" && (
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>
              {state.data.receipt ? `Confirmed (block #${state.data.receipt.blockNumber})` : "Broadcast — pending"}
            </Text>
            <Text style={styles.body}>Hash</Text>
            <Text style={styles.mono}>{state.data.hash}</Text>
            {explorerUrl !== null && (
              <Pressable style={styles.explorerBtn} onPress={() => void Linking.openURL(explorerUrl)}>
                <Text style={styles.explorerBtnText}>Open in explorer ↗</Text>
              </Pressable>
            )}
          </View>
        )}

        <Button title="Sign + send" onPress={() => vm.submit()} disabled={!canSubmit} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 20, gap: 14 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 12, opacity: 0.6 },
  field: { gap: 4 },
  label: { fontSize: 12, opacity: 0.7 },
  input: { padding: 12, backgroundColor: "#F2F2F7", borderRadius: 8, fontSize: 15 },
  body: { fontSize: 12, opacity: 0.7 },
  statusBox: { flexDirection: "row", alignItems: "center", gap: 10 },
  error: { color: "#B00020", fontSize: 13 },
  successBox: { padding: 14, backgroundColor: "#E6F4EA", borderRadius: 8, gap: 4 },
  successTitle: { fontSize: 14, fontWeight: "700" },
  mono: { fontFamily: "Courier", fontSize: 11 },
  explorerBtn: { marginTop: 10, padding: 12, backgroundColor: "#EEF6FB", borderRadius: 8, alignItems: "center" },
  explorerBtnText: { fontSize: 13, fontWeight: "600", color: "#0066CC" }
})

export default SendScreen
