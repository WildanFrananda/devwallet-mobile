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
import AmountInput from "../components/AmountInput"
import AddressDisplay from "../components/AddressDisplay"
import { Chain } from "../core/constants/chains.enum"
import { NetworkRegistry } from "../core/constants/networks"

type AppStackParamList = {
  Send: { chain: Chain; fromAddress: string }
}

function SendScreen(): JSX.Element {
  const vm = useViewModel(SendViewModel)
  const route = useRoute<RouteProp<AppStackParamList, "Send">>()
  const { chain, fromAddress } = route.params
  const recipient = useStream(vm.recipient$, vm.recipient$.value)
  const recipientError = useStream(vm.recipientError$, vm.recipientError$.value)
  const amount = useStream(vm.amount$, vm.amount$.value)
  const state = useStream(vm.state$, vm.state$.value)
  const canSubmit = useStream(vm.canSubmit$, vm.canSubmit$.value)
  const maxLoading = useStream(vm.maxLoading$, vm.maxLoading$.value)
  const cfg = NetworkRegistry.get(chain)
  const gasTiers = useStream(vm.gasTiers$, vm.gasTiers$.value)
  const selectedTier = useStream(vm.selectedTier$, vm.selectedTier$.value)

  useInit(() => {
    vm.bind(chain, fromAddress)
    vm.loadGasTiers()
  })

  const explorerUrl =
    state.status === "success" && cfg.explorerUrl ? `${cfg.explorerUrl}/tx/${state.data.hash}` : null

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Send</Text>
        <Text style={styles.subtitle}>{cfg.name}</Text>

        {chain === Chain.STARKNET_SEPOLIA && (
          <View style={styles.deployBanner}>
            <Text style={styles.deployBannerTitle}>First tx auto-deploys your account</Text>
            <Text style={styles.deployBannerBody}>
              StarkNet accounts are contracts. If this is your first send, the tx bundles a
              one-time account deploy (~0.0001 STRK extra). Future sends use normal gas.
            </Text>
          </View>
        )}

        <AddressDisplay label="From" address={fromAddress} />

        <View style={styles.field}>
          <Text style={styles.label}>Recipient address</Text>
          <TextInput
            style={[styles.input, recipientError && styles.inputError]}
            value={recipient}
            onChangeText={vm.setRecipient.bind(vm)}
            placeholder={`Recipient ${cfg.symbol} address`}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {recipientError && <Text style={styles.fieldError}>{recipientError}</Text>}
        </View>

        <AmountInput
          label="Amount"
          symbol={cfg.symbol}
          value={amount}
          onChange={vm.setAmount.bind(vm)}
          onMaxPress={() => vm.setMaxAmount()}
          maxLoading={maxLoading}
        />

        {gasTiers.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.label}>Gas tier</Text>
            <View style={styles.tierRow}>
              {gasTiers.map(tier => (
                <Pressable
                  key={tier.label}
                  style={[styles.tierBtn, selectedTier === tier.label && styles.tierBtnActive]}
                  onPress={() => vm.setSelectedTier(tier.label)}
                >
                  <Text style={[styles.tierLabel, selectedTier === tier.label && styles.tierLabelActive]}>
                    {tier.label}
                  </Text>
                  <Text style={[styles.tierMeta, selectedTier === tier.label && styles.tierLabelActive]}>
                    {(Number(tier.maxFeePerGas / 1_000_000n) / 1000).toFixed(2)} gwei
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

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
  subtitle: { fontSize: 14, opacity: 0.6 },
  field: { gap: 4 },
  label: { fontSize: 12, opacity: 0.7 },
  input: { padding: 12, backgroundColor: "#F2F2F7", borderRadius: 8, fontSize: 15 },
  inputError: { borderWidth: 1, borderColor: "#B00020" },
  fieldError: { color: "#B00020", fontSize: 12 },
  body: { fontSize: 12, opacity: 0.7 },
  statusBox: { flexDirection: "row", alignItems: "center", gap: 10 },
  error: { color: "#B00020", fontSize: 13 },
  successBox: { padding: 14, backgroundColor: "#E6F4EA", borderRadius: 8, gap: 4 },
  successTitle: { fontSize: 14, fontWeight: "700" },
  mono: { fontFamily: "Courier", fontSize: 11 },
  explorerBtn: { marginTop: 10, padding: 12, backgroundColor: "#EEF6FB", borderRadius: 8, alignItems: "center" },
  explorerBtnText: { fontSize: 13, fontWeight: "600", color: "#0066CC" },
  tierRow: { flexDirection: "row", gap: 8 },
  tierBtn: {
    flex: 1,
    padding: 8,
    backgroundColor: "#F2F2F7",
    borderRadius: 8,
    alignItems: "center"
  },
  tierBtnActive: { backgroundColor: "#007AFF" },
  tierLabel: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  tierLabelActive: { color: "#FFFFFF" },
  tierMeta: { fontSize: 10, opacity: 0.7, marginTop: 2 },
  deployBanner: {
    backgroundColor: "#FFF3E0",
    borderRadius: 8,
    padding: 12,
    gap: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#E65100"
  },
  deployBannerTitle: { fontSize: 13, fontWeight: "700", color: "#E65100" },
  deployBannerBody: { fontSize: 12, color: "#5D4037" }
})

export default SendScreen
