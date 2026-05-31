import { type JSX } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import { useViewModel, useStream } from "react-native-mobile-mvvm"
import WebhookCreateViewModel from "../viewmodels/WebhookCreateViewModel"

function WebhookCreateScreen(): JSX.Element {
  const vm = useViewModel(WebhookCreateViewModel)
  const nav = useNavigation()
  const insets = useSafeAreaInsets()
  const chain = useStream(vm.chain$, vm.chain$.value)
  const contractAddress = useStream(vm.contractAddress$, vm.contractAddress$.value)
  const abi = useStream(vm.abi$, vm.abi$.value)
  const eventSignature = useStream(vm.eventSignature$, vm.eventSignature$.value)
  const candidates = useStream(vm.eventCandidates$, vm.eventCandidates$.value)
  const state = useStream(vm.state$, vm.state$.value)

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => nav.goBack()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>New webhook</Text>
        <View style={styles.right} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.label}>Chain</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {vm.supportedChains.map(c => (
            <Pressable
              key={c}
              style={[styles.chip, chain === c && styles.chipActive]}
              onPress={() => vm.setChain(c)}
            >
              <Text style={[styles.chipText, chain === c && styles.chipTextActive]}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.label}>Contract address</Text>
        <TextInput
          style={styles.input}
          placeholder="0x…"
          autoCapitalize="none"
          autoCorrect={false}
          value={contractAddress}
          onChangeText={(v: string) => vm.setContractAddress(v)}
        />

        <Text style={styles.label}>ABI (optional — improves event picker + decoded args)</Text>
        <TextInput
          style={[styles.input, styles.abi]}
          placeholder='[{"type":"event","name":"Transfer", ...}]'
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          value={abi}
          onChangeText={(v: string) => vm.setAbi(v)}
        />

        {candidates.length > 0 && (
          <>
            <Text style={styles.label}>Pick event from ABI</Text>
            <View style={styles.candidateList}>
              {candidates.map(c => (
                <Pressable
                  key={c.signature}
                  style={[
                    styles.candidate,
                    eventSignature === c.signature && styles.candidateActive
                  ]}
                  onPress={() => vm.setEventSignature(c.signature)}
                >
                  <Text style={styles.candidateText}>{c.signature}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text style={styles.label}>Event signature</Text>
        <TextInput
          style={styles.input}
          placeholder="Transfer(address,address,uint256)"
          autoCapitalize="none"
          autoCorrect={false}
          value={eventSignature}
          onChangeText={(v: string) => vm.setEventSignature(v)}
        />

        {state.status === "error" && <Text style={styles.errorText}>{state.message}</Text>}
        {state.status === "loading" && (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        )}

        <Pressable
          style={[styles.primaryBtn, state.status === "loading" && styles.primaryBtnDisabled]}
          onPress={() => vm.submit()}
          disabled={state.status === "loading"}
        >
          <Text style={styles.primaryBtnText}>Create webhook</Text>
        </Pressable>

        {state.status === "success" && (
          <View style={styles.success}>
            <Text style={styles.successTitle}>Created · subscribed</Text>
            <Text style={styles.successBody}>
              Event {state.data.eventName()} on {state.data.chain}. Push notifications + WS
              events will arrive when the contract emits.
            </Text>
            <Pressable
              style={styles.linkBtn}
              onPress={() => {
                vm.reset()
                nav.goBack()
              }}
            >
              <Text style={styles.linkBtnText}>Back to webhooks</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  back: { color: "#007AFF", fontSize: 14 },
  title: { fontSize: 18, fontWeight: "700" },
  right: { width: 36 },
  body: { padding: 16, gap: 6 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    opacity: 0.55,
    textTransform: "uppercase",
    marginTop: 8
  },
  chipRow: { gap: 8, paddingVertical: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#F2F2F7", borderRadius: 16 },
  chipActive: { backgroundColor: "#007AFF" },
  chipText: { fontSize: 12, color: "#1C1C1E" },
  chipTextActive: { color: "#FFFFFF" },
  input: {
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14
  },
  abi: { minHeight: 100, fontFamily: "Courier", fontSize: 12, textAlignVertical: "top" },
  candidateList: { gap: 6 },
  candidate: { padding: 10, backgroundColor: "#F8F8FA", borderRadius: 8 },
  candidateActive: { backgroundColor: "#E3F2FD", borderWidth: 1, borderColor: "#1976D2" },
  candidateText: { fontFamily: "Courier", fontSize: 12 },
  errorText: { color: "#B00020", marginTop: 8 },
  center: { padding: 16, alignItems: "center" },
  primaryBtn: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "600" },
  success: { backgroundColor: "#E6F4EA", borderRadius: 10, padding: 12, marginTop: 12, gap: 6 },
  successTitle: { fontSize: 14, fontWeight: "700" },
  successBody: { fontSize: 12 },
  linkBtn: { paddingTop: 4 },
  linkBtnText: { fontSize: 13, color: "#007AFF", fontWeight: "600" }
})

export default WebhookCreateScreen
