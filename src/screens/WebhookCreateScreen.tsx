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
import { NetworkRegistry } from "../core/constants/networks"
import type { Chain } from "../core/constants/chains.enum"
import DotGridBackground from "../components/DotGridBackground"
import { colors, typography, spacing, radius, hairline, chainColors, type ChainColorKey } from "../theme"

function chainName(c: string): string {
  try {
    return NetworkRegistry.get(c as unknown as Chain).name
  } catch {
    return c
  }
}

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
    <View
      style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      testID="webhook-create-screen"
    >
      <DotGridBackground />
      <View style={styles.headerBar}>
        <Pressable testID="webhook-create.back" onPress={() => nav.goBack()} hitSlop={8}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>New webhook</Text>
        <View style={styles.right} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.label}>CHAIN</Text>
        <View style={styles.chipRow}>
          {vm.supportedChains.map(c => {
            const active = chain === c
            const hue = chainColors[c as ChainColorKey] ?? colors.border
            return (
              <Pressable
                key={c}
                testID={`webhook-create.chain.${c}`}
                style={[styles.chip, active && { backgroundColor: hue + "1f", borderColor: hue }]}
                onPress={() => vm.setChain(c)}
              >
                <View style={[styles.chipDot, { backgroundColor: hue }]} />
                <Text style={[styles.chipText, active && { color: colors.textPrimary }]}>{chainName(c)}</Text>
              </Pressable>
            )
          })}
        </View>

        <Text style={styles.label}>CONTRACT ADDRESS</Text>
        <TextInput
          testID="webhook-create.contract"
          style={[styles.input, styles.mono]}
          placeholder="0x…"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          value={contractAddress}
          onChangeText={(v: string) => vm.setContractAddress(v)}
        />

        <Text style={styles.label}>ABI (OPTIONAL — IMPROVES EVENT PICKER + DECODED ARGS)</Text>
        <TextInput
          style={[styles.input, styles.abi]}
          placeholder='[{"type":"event","name":"Transfer", ...}]'
          placeholderTextColor={colors.textMuted}
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

        <Text style={styles.label}>EVENT SIGNATURE</Text>
        <TextInput
          testID="webhook-create.event-signature"
          style={[styles.input, styles.mono]}
          placeholder="Transfer(address,address,uint256)"
          placeholderTextColor={colors.textMuted}
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
          testID="webhook-create.submit"
          style={[styles.primaryBtn, state.status === "loading" && styles.primaryBtnDisabled]}
          onPress={() => vm.submit()}
          disabled={state.status === "loading"}
        >
          <Text style={styles.primaryBtnText}>Create webhook</Text>
        </Pressable>

        {state.status === "success" && (
          <View style={styles.success} testID="webhook-create.success">
            <Text style={styles.successTitle}>Created · subscribed</Text>
            <Text style={styles.successBody}>
              Event {state.data.eventName()} on {state.data.chain}. Push notifications + WS
              events will arrive when the contract emits.
            </Text>
            <Pressable
              testID="webhook-create.back-to-list"
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
  safe: { flex: 1, backgroundColor: colors.background },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm
  },
  back: { ...typography.monoLabelSm, color: colors.accentText },
  title: { ...typography.titleMd, color: colors.textPrimary },
  right: { width: 36 },
  body: { padding: spacing.lg, gap: spacing.xs },
  label: { ...typography.labelXs, color: colors.textMuted, marginTop: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, paddingVertical: spacing.xs },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.elevation1,
    borderWidth: hairline,
    borderColor: colors.border,
    borderRadius: radius.full
  },
  chipDot: { width: 7, height: 7, borderRadius: radius.full },
  chipText: { ...typography.monoLabelSm, color: colors.textSecondary },
  input: {
    backgroundColor: colors.elevation1,
    borderWidth: hairline,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    letterSpacing: 0,
    color: colors.textPrimary
  },
  mono: { ...typography.monoDataSm, fontSize: 13, color: colors.textPrimary },
  abi: { minHeight: 100, ...typography.monoDataSm, color: colors.textPrimary, textAlignVertical: "top" },
  candidateList: { gap: spacing.xs },
  candidate: {
    padding: spacing.sm,
    backgroundColor: colors.elevation1,
    borderWidth: hairline,
    borderColor: colors.border,
    borderRadius: radius.md
  },
  candidateActive: { backgroundColor: colors.accentGlow, borderColor: colors.accent },
  candidateText: { ...typography.monoDataSm, color: colors.textSecondary },
  errorText: { ...typography.monoDataSm, color: colors.error, marginTop: spacing.sm },
  center: { padding: spacing.md, alignItems: "center" },
  primaryBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    marginTop: spacing.md,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4
  },
  primaryBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  primaryBtnText: { ...typography.monoLabelSm, fontSize: 13, color: colors.onAccent },
  success: {
    backgroundColor: colors.successGlow,
    borderWidth: hairline,
    borderColor: colors.success + "55",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.xs
  },
  successTitle: { ...typography.titleMd, color: colors.success },
  successBody: { ...typography.bodyMd, color: colors.textSecondary },
  linkBtn: { paddingTop: spacing.xs },
  linkBtnText: { ...typography.monoLabelSm, color: colors.accentText }
})

export default WebhookCreateScreen
