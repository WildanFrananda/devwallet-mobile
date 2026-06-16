import { type JSX } from "react"
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRoute, type RouteProp } from "@react-navigation/native"
import type Transaction from "../models/transaction.model"
import { Chain } from "../core/constants/chains.enum"
import { NetworkRegistry } from "../core/constants/networks"
import { formatNativeAmount } from "../utils/format"
import Section from "../components/Section"
import DotGridBackground from "../components/DotGridBackground"
import { colors, typography, spacing, radius, hairline, chainColors, type ChainColorKey } from "../theme"

type AppStackParamList = {
  Main: undefined
  TxHistory: { chain: Chain; address: string }
  TxDetail: { tx: Transaction; chain: Chain }
}

function Field({ label, value, mono = true }: { label: string; value: string; mono?: boolean }): JSX.Element {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={mono ? styles.mono : styles.value} selectable>
        {value}
      </Text>
    </View>
  )
}

function TxDetailScreen(): JSX.Element {
  const route = useRoute<RouteProp<AppStackParamList, "TxDetail">>()
  const { tx, chain } = route.params
  const cfg = NetworkRegistry.get(chain)
  const dot = chainColors[chain as ChainColorKey] ?? colors.border
  const failed = tx.status === "failed"
  const explorerUrl = cfg.explorerUrl ? `${cfg.explorerUrl}/tx/${tx.hash}` : null

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]} testID="tx-detail-screen">
      <DotGridBackground />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>TRANSACTION</Text>
          <View style={styles.titleRow}>
            <View style={styles.chainTag}>
              <View style={[styles.dot, { backgroundColor: dot }]} />
              <Text style={styles.chainName}>{cfg.name}</Text>
            </View>
            <View style={styles.statusPill}>
              <View style={[styles.statusDot, failed ? styles.failedDot : styles.successDot]} />
              <Text style={[styles.statusText, failed ? styles.failedText : styles.successText]}>
                {tx.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <Section title="TRANSFER">
          <Field label="VALUE" value={formatNativeAmount(tx.value, cfg.decimals, cfg.symbol, 8)} />
          <Field label="FROM" value={tx.from} />
          <Field label="TO" value={tx.to} />
        </Section>

        <Section title="DETAILS">
          <Field label="HASH" value={tx.hash} />
          {tx.fee !== null && <Field label="FEE" value={formatNativeAmount(tx.fee, cfg.decimals, cfg.symbol, 8)} />}
          {tx.blockNumber !== null && <Field label="BLOCK" value={`#${tx.blockNumber}`} />}
          {tx.timestamp !== null && <Field label="TIMESTAMP" value={tx.timestamp.toISOString()} />}
        </Section>

        {explorerUrl !== null && (
          <Pressable style={styles.explorerBtn} onPress={() => void Linking.openURL(explorerUrl)}>
            <Text style={styles.explorerBtnText}>Open in explorer ↗</Text>
          </Pressable>
        )}

        <Text style={styles.footer}>{cfg.name.toUpperCase()} · TESTNET · ON-CHAIN RECORD</Text>
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
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
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
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full
  },
  successDot: {
    backgroundColor: colors.success
  },
  failedDot: {
    backgroundColor: colors.error
  },
  statusText: {
    ...typography.monoLabelSm
  },
  successText: {
    color: colors.success
  },
  failedText: {
    color: colors.error
  },
  field: {
    gap: spacing.xs
  },
  fieldLabel: {
    ...typography.monoLabelSm,
    color: colors.textMuted
  },
  value: {
    ...typography.bodyMd,
    color: colors.textPrimary
  },
  mono: {
    ...typography.monoDataSm,
    color: colors.textSecondary
  },
  explorerBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: hairline,
    borderColor: colors.accent,
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

export default TxDetailScreen
