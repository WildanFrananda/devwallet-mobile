import { type JSX } from "react"
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
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { useViewModel, useStream, useInit } from "react-native-mobile-mvvm"
import WebhookListViewModel from "../viewmodels/WebhookListViewModel"
import type { AppStackParamList } from "../navigation/AppNavigator"
import type Webhook from "../models/webhook.model"

type AppNav = NativeStackNavigationProp<AppStackParamList>

function WebhookListScreen(): JSX.Element {
  const vm = useViewModel(WebhookListViewModel)
  const nav = useNavigation<AppNav>()
  const insets = useSafeAreaInsets()
  const state = useStream(vm.state$, vm.state$.value)
  const lastEventAt = useStream(vm.lastEventAt$, vm.lastEventAt$.value)

  useInit(() => vm.refresh())

  const list = state.status === "success" ? state.data : []
  const showPulse = lastEventAt > 0 && Date.now() - lastEventAt < 3_000

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => nav.goBack()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Webhooks</Text>
          {showPulse && <View style={styles.pulseDot} />}
        </View>
        <Pressable onPress={() => nav.navigate("WebhookCreate")}>
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
        {list.map(w => (
          <WebhookRow
            key={w.id}
            webhook={w}
            onPress={() => nav.navigate("WebhookDetail", { webhook: w })}
          />
        ))}
      </ScrollView>
    </View>
  )
}

function WebhookRow({ webhook, onPress }: { webhook: Webhook; onPress: () => void }): JSX.Element {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Text style={styles.rowEvent}>{webhook.eventName()}</Text>
      <Text style={styles.rowMeta}>
        {webhook.chain} · {webhook.contractAddress.slice(0, 10)}…
      </Text>
      <Text style={styles.rowExpires}>expires {webhook.expiresAt.toLocaleDateString()}</Text>
    </Pressable>
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
  titleWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { fontSize: 18, fontWeight: "700" },
  pulseDot: { width: 8, height: 8, backgroundColor: "#34C759", borderRadius: 4 },
  headerAction: { color: "#007AFF", fontSize: 14, fontWeight: "600" },
  list: { padding: 16, gap: 8 },
  center: { padding: 40, alignItems: "center" },
  empty: { textAlign: "center", opacity: 0.55, marginTop: 40 },
  errorText: { color: "#B00020", padding: 12 },
  row: { backgroundColor: "#F8F8FA", borderRadius: 10, padding: 12, gap: 2 },
  rowEvent: { fontSize: 14, fontWeight: "600", fontFamily: "Courier" },
  rowMeta: { fontSize: 11, opacity: 0.65, fontFamily: "Courier" },
  rowExpires: { fontSize: 11, opacity: 0.5 }
})

export default WebhookListScreen
