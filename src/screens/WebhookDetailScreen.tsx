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
      <View style={styles.headerBar}>
        <Pressable onPress={() => nav.goBack()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>{webhook?.eventName() ?? "Webhook"}</Text>
        <Pressable onPress={onDelete}>
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
            <MetaRow label="chain" value={webhook.chain} />
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
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  back: { color: "#007AFF", fontSize: 14 },
  title: { fontSize: 16, fontWeight: "700", fontFamily: "Courier" },
  headerDanger: { color: "#B00020", fontSize: 14, fontWeight: "600" },
  body: { padding: 16, gap: 8 },
  metaBox: { backgroundColor: "#F8F8FA", borderRadius: 10, padding: 12, gap: 4 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  metaLabel: { fontSize: 11, fontWeight: "700", opacity: 0.55, width: 80 },
  metaValue: { fontSize: 12, flexShrink: 1, textAlign: "right" },
  mono: { fontFamily: "Courier" },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    opacity: 0.55,
    textTransform: "uppercase",
    marginTop: 10
  },
  center: { padding: 24, alignItems: "center" },
  empty: { textAlign: "center", opacity: 0.55, marginTop: 24 },
  errorText: { color: "#B00020", padding: 8 }
})

export default WebhookDetailScreen
