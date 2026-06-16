import { useCallback, type JSX } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useFocusEffect, useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { useViewModel, useStream, useInit } from "react-native-mobile-mvvm"
import WebhookListViewModel from "../viewmodels/WebhookListViewModel"
import type { AppStackParamList } from "../navigation/AppNavigator"
import type Webhook from "../models/webhook.model"
import { NetworkRegistry } from "../core/constants/networks"
import type { Chain } from "../core/constants/chains.enum"
import DotGridBackground from "../components/DotGridBackground"
import { colors, typography, spacing, radius, hairline, chainColors, type ChainColorKey } from "../theme"

type AppNav = NativeStackNavigationProp<AppStackParamList>

// Webhook.chain is a string union (same values as the Chain enum); cast to look
// up the human-readable network name.
function chainName(c: Webhook["chain"]): string {
  try {
    return NetworkRegistry.get(c as unknown as Chain).name
  } catch {
    return String(c)
  }
}

function WebhookListScreen(): JSX.Element {
  const vm = useViewModel(WebhookListViewModel)
  const nav = useNavigation<AppNav>()
  const insets = useSafeAreaInsets()
  const state = useStream(vm.state$, vm.state$.value)
  const lastEventAt = useStream(vm.lastEventAt$, vm.lastEventAt$.value)

  useInit(() => vm.refresh())

  // Refresh on every focus so a webhook just created (then navigated back to)
  // appears without a manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      vm.refresh()
    }, [vm])
  )

  const list = state.status === "success" ? state.data : []
  const showPulse = lastEventAt > 0 && Date.now() - lastEventAt < 3_000

  return (
    <View
      style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      testID="webhook-list-screen"
    >
      <DotGridBackground />
      <View style={styles.headerBar}>
        <Pressable onPress={() => nav.goBack()} hitSlop={8}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Webhooks</Text>
          {showPulse && <View style={styles.pulseDot} />}
        </View>
        <Pressable testID="webhook-list.add" onPress={() => nav.navigate("WebhookCreate")}>
          <Text style={styles.headerAction}>+ Add</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={state.status === "loading"} onRefresh={() => vm.refresh()} />
        }
      >
        {state.status === "loading" && list.length === 0 && (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        )}
        {state.status === "error" && <Text style={styles.errorText}>{state.message}</Text>}
        {state.status === "success" && list.length === 0 && (
          <Text style={styles.empty}>
            No webhooks. Tap “+ Add” to subscribe to a contract event.
          </Text>
        )}
        {list.map((w, index) => (
          <WebhookRow
            key={w.id}
            index={index}
            webhook={w}
            onPress={() => nav.navigate("WebhookDetail", { webhook: w })}
          />
        ))}
      </ScrollView>
    </View>
  )
}

function WebhookRow({
  webhook,
  index,
  onPress
}: {
  webhook: Webhook
  index: number
  onPress: () => void
}): JSX.Element {
  const hue = chainColors[webhook.chain as ChainColorKey] ?? colors.border
  return (
    <Pressable
      testID={`webhook-list.row.${index}`}
      style={[styles.row, { borderColor: hue + "33" }]}
      onPress={onPress}
    >
      <View style={styles.rowEventLine}>
        <View style={[styles.chainDot, { backgroundColor: hue }]} />
        <Text style={styles.rowEvent} numberOfLines={1}>
          {webhook.eventName()}
        </Text>
      </View>
      <Text style={styles.rowMeta} numberOfLines={1}>
        {chainName(webhook.chain)} · {webhook.contractAddress.slice(0, 10)}…
      </Text>
      <Text style={styles.rowExpires}>expires {webhook.expiresAt.toLocaleDateString()}</Text>
    </Pressable>
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
  titleWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { ...typography.titleMd, color: colors.textPrimary },
  pulseDot: { width: 8, height: 8, backgroundColor: colors.success, borderRadius: radius.full },
  headerAction: { ...typography.monoLabelSm, color: colors.accentText },
  list: { padding: spacing.lg, gap: spacing.sm },
  center: { padding: 40, alignItems: "center" },
  empty: { ...typography.bodyMd, color: colors.textMuted, textAlign: "center", marginTop: 40 },
  errorText: { ...typography.monoDataSm, color: colors.error, padding: spacing.md },
  row: {
    backgroundColor: colors.elevation1,
    borderRadius: radius.lg,
    borderWidth: hairline,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xxs
  },
  rowEventLine: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  chainDot: { width: 7, height: 7, borderRadius: radius.full },
  rowEvent: { ...typography.monoDataSm, fontSize: 14, color: colors.textPrimary, flexShrink: 1 },
  rowMeta: { ...typography.monoDataSm, color: colors.textMuted },
  rowExpires: { ...typography.monoDataSm, fontSize: 10, color: colors.textMuted }
})

export default WebhookListScreen
