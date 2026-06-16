import { type JSX, useState } from "react"
import { View, Text, TextInput, StyleSheet, ScrollView, ActivityIndicator, Pressable, Linking } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRoute, type RouteProp } from "@react-navigation/native"
import { useViewModel, useStream, useInit } from "react-native-mobile-mvvm"
import SendViewModel from "../viewmodels/SendViewModel"
import AmountInput from "../components/AmountInput"
import AddressDisplay from "../components/AddressDisplay"
import PrimaryButton from "../components/PrimaryButton"
import Section from "../components/Section"
import DotGridBackground from "../components/DotGridBackground"
import FadeInView from "../components/FadeInView"
import { Chain } from "../core/constants/chains.enum"
import { NetworkRegistry } from "../core/constants/networks"
import { colors, typography, spacing, radius, hairline, chainColors, type ChainColorKey } from "../theme"

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
  const gasTiers = useStream(vm.gasTiers$, vm.gasTiers$.value)
  const selectedTier = useStream(vm.selectedTier$, vm.selectedTier$.value)
  const [recipientFocused, setRecipientFocused] = useState(false)
  const cfg = NetworkRegistry.get(chain)
  const dot = chainColors[chain as ChainColorKey] ?? colors.border

  useInit(() => {
    vm.bind(chain, fromAddress)
    vm.loadGasTiers()
  })

  const explorerUrl =
    state.status === "success" && cfg.explorerUrl ? `${cfg.explorerUrl}/tx/${state.data.hash}` : null

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]} testID="send-screen">
      <DotGridBackground />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <FadeInView style={styles.header} translateY={8}>
          <Text style={styles.eyebrow} testID="send.title">
            SEND
          </Text>
          <View style={styles.chainTag}>
            <View style={[styles.dot, { backgroundColor: dot }]} />
            <Text style={styles.chainName}>{cfg.name}</Text>
            <Text style={styles.chainSym}>{cfg.symbol}</Text>
          </View>
        </FadeInView>

        {chain === Chain.STARKNET_SEPOLIA && (
          <View style={styles.callout}>
            <View style={styles.calloutDot} />
            <View style={styles.calloutText}>
              <Text style={styles.calloutTitle}>First tx auto-deploys your account</Text>
              <Text style={styles.calloutBody}>
                StarkNet accounts are contracts. Your first send bundles a one-time account deploy (~0.0001 STRK
                extra). Future sends use normal gas.
              </Text>
            </View>
          </View>
        )}

        <Section title="TRANSFER">
          <AddressDisplay label="From" address={fromAddress} />

          <View style={styles.field}>
            <Text style={styles.label}>RECIPIENT ADDRESS</Text>
            <TextInput
              testID="send.recipient"
              style={[
                styles.input,
                recipientFocused && styles.inputFocused,
                recipientError && styles.inputError
              ]}
              value={recipient}
              onChangeText={vm.setRecipient.bind(vm)}
              onFocus={() => setRecipientFocused(true)}
              onBlur={() => setRecipientFocused(false)}
              placeholder={`${cfg.symbol} address`}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
            />
            {recipientError && <Text style={styles.fieldError}>{recipientError}</Text>}
          </View>

          <AmountInput
            testID="send.amount"
            label="Amount"
            symbol={cfg.symbol}
            value={amount}
            onChange={vm.setAmount.bind(vm)}
            onMaxPress={() => vm.setMaxAmount()}
            maxLoading={maxLoading}
          />
        </Section>

        {gasTiers.length > 0 && (
          <Section title="GAS TIER">
            <View style={styles.tierRow}>
              {gasTiers.map(tier => {
                const active = selectedTier === tier.label
                return (
                  <Pressable
                    key={tier.label}
                    style={[styles.tierBtn, active && styles.tierBtnActive]}
                    onPress={() => vm.setSelectedTier(tier.label)}
                  >
                    <Text style={[styles.tierLabel, active && styles.tierLabelActive]}>{tier.label.toUpperCase()}</Text>
                    <Text style={[styles.tierMeta, active && styles.tierMetaActive]}>
                      {(Number(tier.maxFeePerGas / 1_000_000n) / 1000).toFixed(2)} gwei
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </Section>
        )}

        {state.status === "loading" && (
          <View style={styles.statusBox}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.statusText}>Signing + broadcasting…</Text>
          </View>
        )}

        {state.status === "error" && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText} testID="send.error">
              {state.message}
            </Text>
          </View>
        )}

        {state.status === "success" && (
          <Section
            title="RESULT"
            trailing={<View style={[styles.dot, { backgroundColor: colors.success }]} />}
          >
            <View testID="send.success">
              <Text style={styles.successTitle} testID="send.status">
                {state.data.receipt ? `Confirmed · block #${state.data.receipt.blockNumber}` : "Broadcast · pending"}
              </Text>
              <Text style={styles.label}>TX HASH</Text>
              <Text style={styles.mono} testID="send.tx-hash">
                {state.data.hash}
              </Text>
              {explorerUrl !== null && (
                <Pressable style={styles.explorerBtn} onPress={() => void Linking.openURL(explorerUrl)}>
                  <Text style={styles.explorerBtnText}>Open in explorer ↗</Text>
                </Pressable>
              )}
            </View>
          </Section>
        )}

        <PrimaryButton
          testID="send.submit"
          label="Sign + send"
          onPress={() => vm.submit()}
          disabled={!canSubmit}
          loading={state.status === "loading"}
        />

        <Text style={styles.footer}>SIGNED ON-DEVICE · BROADCAST VIA RPC · NON-CUSTODIAL</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.xl
  },
  header: {
    gap: spacing.sm
  },
  eyebrow: {
    ...typography.monoLabelSm,
    color: colors.textMuted
  },
  chainTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full
  },
  chainName: {
    ...typography.headlineMd,
    color: colors.textPrimary
  },
  chainSym: {
    ...typography.monoLabelSm,
    color: colors.textMuted
  },
  callout: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  calloutDot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
    backgroundColor: colors.warning,
    marginTop: 5
  },
  calloutText: {
    flex: 1,
    gap: spacing.xs
  },
  calloutTitle: {
    ...typography.bodyMd,
    fontWeight: "600",
    color: colors.textPrimary
  },
  calloutBody: {
    ...typography.bodyMd,
    color: colors.textSecondary
  },
  field: {
    gap: spacing.xs
  },
  label: {
    ...typography.monoLabelSm,
    color: colors.textMuted
  },
  input: {
    // Proportional (system) font, not monospace: the placeholder is plain
    // English ("ETH address") and monospace side-bearing made it read as
    // stretched/"melar". System font keeps letters tight. letterSpacing 0
    // guards against any inherited tracking.
    fontSize: 15,
    letterSpacing: 0,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: hairline,
    borderColor: colors.border
  },
  inputFocused: {
    borderColor: colors.accent
  },
  inputError: {
    borderColor: colors.error
  },
  fieldError: {
    ...typography.monoLabelSm,
    color: colors.error
  },
  tierRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  tierBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: hairline,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    gap: 2
  },
  tierBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceInteractive
  },
  tierLabel: {
    ...typography.monoLabelSm,
    color: colors.textSecondary
  },
  tierLabelActive: {
    color: colors.accentText
  },
  tierMeta: {
    ...typography.monoDataSm,
    color: colors.textMuted
  },
  tierMetaActive: {
    color: colors.textSecondary
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  statusText: {
    ...typography.bodyMd,
    color: colors.textSecondary
  },
  errorBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: hairline,
    borderColor: colors.error,
    backgroundColor: colors.surface
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error
  },
  successTitle: {
    ...typography.bodyLg,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.sm
  },
  mono: {
    ...typography.monoDataSm,
    color: colors.textSecondary
  },
  explorerBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: hairline,
    borderColor: colors.border,
    alignItems: "center"
  },
  explorerBtnText: {
    ...typography.monoLabelSm,
    color: colors.accentText
  },
  footer: {
    ...typography.monoLabelSm,
    color: colors.textMuted,
    textAlign: "center"
  }
})

export default SendScreen
