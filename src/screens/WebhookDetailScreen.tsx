import { type JSX } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native"
import { useViewModel, useStream, useInit } from "react-native-mobile-mvvm"
import WebhookDetailViewModel from "../viewmodels/WebhookDetailViewModel"
import type { AppStackParamList } from "../navigation/AppNavigator"
import WebhookLogItem from "../components/WebhookLogItem"
import { NetworkRegistry } from "../core/constants/networks"
import type { Chain } from "../core/constants/chains.enum"
import DotGridBackground from "../components/DotGridBackground"
import { colors, typography, spacing, radius, hairline } from "../theme"

function chainName(c: string): string {
  try {
    return NetworkRegistry.get(c as unknown as Chain).name
  } catch {
    return c
  }
}

function WebhookDetailScreen(): JSX.Element {
  const vm = useViewModel(WebhookDetailViewModel)
  const nav = useNavigation()
  const route = useRoute<RouteProp<AppStackParamList, "WebhookDetail">>()
  const insets = useSafeAreaInsets()
  const webhook = useStream(vm.webhook$, vm.webhook$.value)
  const logs = useStream(vm.logs$, vm.logs$.value)

  useInit(() => vm.bind(route.params.webhook))

  function onDelete(): void {
    Alert.alert("Delete webhook?", webhook?.eventName() ?? "", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => vm.delete(() => nav.goBack())
      }
    ])
  }

  const list = logs.status === "success" ? logs.data : []

  return (
    <View
      style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      testID="webhook-detail-screen"
    >
      <DotGridBackground />
      <View style={styles.headerBar}>
        <Pressable onPress={() => nav.goBack()} hitSlop={8}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {webhook?.eventName() ?? "Webhook"}
        </Text>
        <Pressable onPress={onDelete} hitSlop={8}>
          <Text style={styles.headerDanger}>Delete</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={logs.status === "loading"}
            onRefresh={() => vm.refreshLogs()}
          />
        }
      >
        {webhook && (
          <View style={styles.metaBox}>
            <MetaRow label="chain" value={chainName(webhook.chain)} />
            <MetaRow label="contract" value={webhook.contractAddress} mono />
            <MetaRow label="signature" value={webhook.eventSignature} mono />
            <MetaRow label="expires" value={webhook.expiresAt.toLocaleString()} />
            <MetaRow label="created" value={webhook.createdAt.toLocaleString()} />
          </View>
        )}

        <Text style={styles.sectionLabel}>Logs</Text>

        {logs.status === "loading" && list.length === 0 && (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        )}
        {logs.status === "error" && <Text style={styles.errorText}>{logs.message}</Text>}
        {logs.status === "success" && list.length === 0 && (
          <Text style={styles.empty} testID="webhook-detail.empty">No events fired yet.</Text>
        )}
        {list.map((l, index) => (
          <WebhookLogItem key={l.id} testID={`webhook-detail.log-row.${index}`} log={l} />
        ))}
      </ScrollView>
    </View>
  )
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }): JSX.Element {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={[styles.metaValue, mono === true && styles.mono]} selectable>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm
  },
  back: { ...typography.monoLabelSm, color: colors.accentText },
  title: { ...typography.monoDataSm, fontSize: 15, color: colors.textPrimary, flexShrink: 1, textAlign: "center" },
  headerDanger: { ...typography.monoLabelSm, color: colors.error },
  body: { padding: spacing.lg, gap: spacing.sm },
  metaBox: {
    backgroundColor: colors.elevation1,
    borderRadius: radius.lg,
    borderWidth: hairline,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs
  },
  metaRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  metaLabel: { ...typography.labelXs, color: colors.textMuted, width: 80 },
  metaValue: { ...typography.monoDataSm, color: colors.textSecondary, flexShrink: 1, textAlign: "right" },
  mono: { ...typography.monoDataSm, color: colors.textPrimary },
  sectionLabel: { ...typography.labelXs, color: colors.textMuted, marginTop: spacing.sm },
  center: { padding: 24, alignItems: "center" },
  empty: { ...typography.bodyMd, color: colors.textMuted, textAlign: "center", marginTop: 24 },
  errorText: { ...typography.monoDataSm, color: colors.error, padding: spacing.sm }
})

export default WebhookDetailScreen
