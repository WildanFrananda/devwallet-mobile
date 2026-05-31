import { useMemo, useState, type JSX } from "react"
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ScrollView,
  Share,
  Alert,
  Modal
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useViewModel, useStream } from "react-native-mobile-mvvm"
import RpcInspectorViewModel, {
  type ChainFilter,
  type StatusFilter
} from "../viewmodels/RpcInspectorViewModel"
import { Chain } from "../core/constants/chains.enum"
import { NetworkRegistry } from "../core/constants/networks"
import type RpcLog from "../models/rpc-log.model"

const CHAIN_OPTIONS: ReadonlyArray<{ value: ChainFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: Chain.EVM_SEPOLIA, label: "Sepolia" },
  { value: Chain.EVM_POLYGON_AMOY, label: "Amoy" },
  { value: Chain.EVM_BASE_SEPOLIA, label: "Base" },
  { value: Chain.BITCOIN_TESTNET, label: "BTC" },
  { value: Chain.SOLANA_DEVNET, label: "SOL" },
  { value: Chain.COSMOS_THETA, label: "ATOM" },
  { value: Chain.XRPL_TESTNET, label: "XRP" },
  { value: Chain.STARKNET_SEPOLIA, label: "STRK" }
]

const STATUS_OPTIONS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "success", label: "OK" },
  { value: "error", label: "Err" }
]

function RpcInspectorScreen(): JSX.Element {
  const vm = useViewModel(RpcInspectorViewModel)
  const insets = useSafeAreaInsets()
  const logs = useStream(vm.filteredLogs$, vm.filteredLogs$.value)
  const count = useStream(vm.logCount$, vm.logCount$.value)
  const chainFilter = useStream(vm.chainFilter$, vm.chainFilter$.value)
  const statusFilter = useStream(vm.statusFilter$, vm.statusFilter$.value)
  const searchQuery = useStream(vm.searchQuery$, vm.searchQuery$.value)
  const mocks = useStream(vm.mocks$, vm.mocks$.value)
  const lastReplay = useStream(vm.lastReplay$, vm.lastReplay$.value)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [mockPrompt, setMockPrompt] = useState<{ method: string; existingJson: string } | null>(null)
  const [mocksOpen, setMocksOpen] = useState<boolean>(false)

  async function onExport(): Promise<void> {
    const json = vm.exportJson()
    try {
      await Share.share({
        message: json,
        title: `devwallet-rpc-logs-${new Date().toISOString()}.json`
      })
    } catch {
      // user dismissed share sheet — no-op
    }
  }

  function onLongPress(log: RpcLog): void {
    const existing = mocks.find(m => m.method === log.method)
    const existingJson = existing ? JSON.stringify(existing.response, null, 2) : ""
    setMockPrompt({ method: log.method, existingJson })
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.title}>RPC Inspector</Text>
          <Text style={styles.subtitle}>
            {logs.length} / {count} entries
          </Text>
        </View>
        <Pressable style={styles.mockChip} onPress={() => setMocksOpen(true)}>
          <Text style={styles.mockChipText}>Mocks · {mocks.length}</Text>
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Filter method, endpoint, params…"
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoCorrect={false}
          value={searchQuery}
          onChangeText={vm.setSearchQuery.bind(vm)}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {CHAIN_OPTIONS.map(opt => (
          <Pressable
            key={opt.value}
            style={[styles.chip, chainFilter === opt.value && styles.chipActive]}
            onPress={() => vm.setChainFilter(opt.value)}
          >
            <Text style={[styles.chipText, chainFilter === opt.value && styles.chipTextActive]}>{opt.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {STATUS_OPTIONS.map(opt => (
          <Pressable
            key={opt.value}
            style={[styles.chip, statusFilter === opt.value && styles.chipActive]}
            onPress={() => vm.setStatusFilter(opt.value)}
          >
            <Text style={[styles.chipText, statusFilter === opt.value && styles.chipTextActive]}>{opt.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.actionRow}>
        <Pressable style={styles.actionBtn} onPress={() => void onExport()}>
          <Text style={styles.actionText}>Export JSON</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, styles.actionBtnDanger]} onPress={vm.clearLogs.bind(vm)}>
          <Text style={styles.actionTextDanger}>Clear</Text>
        </Pressable>
      </View>

      <FlatList
        data={logs}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <LogRow
            log={item}
            expanded={expandedId === item.id}
            mockMethods={mocks.map(m => m.method)}
            onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
            onLongPress={() => onLongPress(item)}
            onReplay={() => vm.replay(item.id)}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No RPC calls yet. Open Wallet to fire requests.</Text>}
      />

      <MockPromptModal
        prompt={mockPrompt}
        onCancel={() => setMockPrompt(null)}
        onDelete={method => {
          vm.deleteMock(method)
          setMockPrompt(null)
        }}
        onSave={(method, json) => {
          try {
            vm.setMock(method, json)
            setMockPrompt(null)
          } catch (err) {
            Alert.alert("Invalid mock", err instanceof Error ? err.message : String(err))
          }
        }}
      />

      <MocksListModal
        visible={mocksOpen}
        mocks={mocks}
        onClose={() => setMocksOpen(false)}
        onDelete={method => vm.deleteMock(method)}
        onClearAll={() => vm.clearAllMocks()}
      />

      <ReplayOutcomeBanner outcome={lastReplay} onDismiss={() => vm.dismissReplay()} />
    </View>
  )
}

function LogRow({
  log,
  expanded,
  mockMethods,
  onToggle,
  onLongPress,
  onReplay
}: {
  log: RpcLog
  expanded: boolean
  mockMethods: ReadonlyArray<string>
  onToggle: () => void
  onLongPress: () => void
  onReplay: () => void
}): JSX.Element {
  const chainLabel = useMemo(() => {
    try {
      return NetworkRegistry.get(log.chain).name
    } catch {
      return log.chain
    }
  }, [log.chain])
  const hasMockForMethod = mockMethods.includes(log.method)
  return (
    <Pressable
      style={[styles.row, log.status === "error" && styles.rowError, log.mocked && styles.rowMocked]}
      onPress={onToggle}
      onLongPress={onLongPress}
    >
      <View style={styles.rowHeader}>
        <View style={styles.rowMethodWrap}>
          <Text style={styles.rowMethod}>{log.method}</Text>
          {log.mocked && <Text style={styles.badgeMocked}>MOCKED</Text>}
          {!log.mocked && hasMockForMethod && <Text style={styles.badgeMockReady}>MOCK SET</Text>}
        </View>
        <Text style={[styles.rowStatus, log.status === "error" ? styles.statusErr : styles.statusOk]}>
          {log.status === "error" ? "ERR" : "OK"} · {log.latencyMs}ms
        </Text>
      </View>
      <Text style={styles.rowMeta}>
        {chainLabel} · {log.timestamp.toLocaleTimeString()}
      </Text>
      {expanded && (
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Endpoint</Text>
          <Text style={styles.detailValue}>{log.endpoint}</Text>
          <Text style={styles.detailLabel}>Params</Text>
          <Text style={styles.detailValue}>{JSON.stringify(log.toJSON().params, null, 2)}</Text>
          {log.status === "success" ? (
            <>
              <Text style={styles.detailLabel}>Response</Text>
              <Text style={styles.detailValue}>{JSON.stringify(log.toJSON().response, null, 2)}</Text>
            </>
          ) : (
            <>
              <Text style={styles.detailLabel}>Error</Text>
              <Text style={[styles.detailValue, styles.statusErr]}>{log.errorMessage}</Text>
            </>
          )}
          <View style={styles.detailActions}>
            <Pressable style={styles.detailBtn} onPress={onReplay}>
              <Text style={styles.detailBtnText}>↻ Replay</Text>
            </Pressable>
            <Pressable style={styles.detailBtn} onPress={onLongPress}>
              <Text style={styles.detailBtnText}>⛭ Mock</Text>
            </Pressable>
          </View>
        </View>
      )}
    </Pressable>
  )
}

function MockPromptModal({
  prompt,
  onCancel,
  onSave,
  onDelete
}: {
  prompt: { method: string; existingJson: string } | null
  onCancel: () => void
  onSave: (method: string, json: string) => void
  onDelete: (method: string) => void
}): JSX.Element {
  const [draft, setDraft] = useState<string>("")
  const isEditing = prompt?.existingJson.length ? prompt.existingJson.length > 0 : false

  // Reset draft whenever a new prompt opens.
  useMemo(() => {
    setDraft(prompt?.existingJson ?? "")
  }, [prompt])

  return (
    <Modal visible={prompt !== null} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalBody}>
          <Text style={styles.modalTitle}>Mock {prompt?.method}</Text>
          <Text style={styles.modalHint}>
            Response value returned for every future call to this method. JSON parsed; falls back to raw string.
          </Text>
          <TextInput
            style={styles.modalInput}
            value={draft}
            onChangeText={setDraft}
            placeholder='e.g. "0x1234" or { "result": "ok" }'
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
            multiline
          />
          <View style={styles.modalActions}>
            <Pressable style={styles.modalBtn} onPress={onCancel}>
              <Text style={styles.modalBtnText}>Cancel</Text>
            </Pressable>
            {isEditing && prompt && (
              <Pressable
                style={[styles.modalBtn, styles.modalBtnDanger]}
                onPress={() => onDelete(prompt.method)}
              >
                <Text style={styles.modalBtnTextDanger}>Delete mock</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.modalBtn, styles.modalBtnPrimary]}
              onPress={() => prompt && onSave(prompt.method, draft)}
            >
              <Text style={styles.modalBtnTextPrimary}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

function MocksListModal({
  visible,
  mocks,
  onClose,
  onDelete,
  onClearAll
}: {
  visible: boolean
  mocks: ReadonlyArray<{ method: string; response: unknown; setAtIso: string }>
  onClose: () => void
  onDelete: (method: string) => void
  onClearAll: () => void
}): JSX.Element {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalBody}>
          <Text style={styles.modalTitle}>Active mocks ({mocks.length})</Text>
          {mocks.length === 0 ? (
            <Text style={styles.modalHint}>
              No active mocks. Long-press any log row to mock that method.
            </Text>
          ) : (
            <ScrollView style={styles.mockList}>
              {mocks.map(m => (
                <View key={m.method} style={styles.mockRow}>
                  <View style={styles.mockRowText}>
                    <Text style={styles.mockMethod}>{m.method}</Text>
                    <Text style={styles.mockResponse} numberOfLines={2}>
                      {JSON.stringify(m.response)}
                    </Text>
                  </View>
                  <Pressable onPress={() => onDelete(m.method)}>
                    <Text style={styles.mockDelete}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
          <View style={styles.modalActions}>
            {mocks.length > 0 && (
              <Pressable style={[styles.modalBtn, styles.modalBtnDanger]} onPress={onClearAll}>
                <Text style={styles.modalBtnTextDanger}>Clear all</Text>
              </Pressable>
            )}
            <Pressable style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={onClose}>
              <Text style={styles.modalBtnTextPrimary}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

function ReplayOutcomeBanner({
  outcome,
  onDismiss
}: {
  outcome: { logId: string; outcome: { kind: string; response?: unknown; message?: string; latencyMs: number } } | null
  onDismiss: () => void
}): JSX.Element | null {
  if (outcome === null) return null
  const isSuccess = outcome.outcome.kind === "success"
  return (
    <Pressable
      style={[styles.replayBanner, isSuccess ? styles.replayBannerOk : styles.replayBannerErr]}
      onPress={onDismiss}
    >
      <Text style={styles.replayBannerLabel}>
        {isSuccess ? "Replay OK" : "Replay failed"} · {outcome.outcome.latencyMs}ms · tap to dismiss
      </Text>
      <Text style={styles.replayBannerValue} numberOfLines={3}>
        {isSuccess
          ? JSON.stringify(
            outcome.outcome.response,
            (_k: string, v: unknown) => (typeof v === "bigint" ? v.toString() : v)
          )
          : outcome.outcome.message}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12
  },
  title: { fontSize: 20, fontWeight: "700" },
  subtitle: { fontSize: 12, opacity: 0.6, marginTop: 2 },
  mockChip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#FFF3E0", borderRadius: 14 },
  mockChipText: { fontSize: 12, fontWeight: "600", color: "#E65100" },
  searchRow: { paddingHorizontal: 20, paddingBottom: 8 },
  search: {
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14
  },
  chipRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F2F2F7",
    borderRadius: 16
  },
  chipActive: { backgroundColor: "#007AFF" },
  chipText: { fontSize: 12, fontWeight: "500", color: "#1C1C1E" },
  chipTextActive: { color: "#FFFFFF" },
  actionRow: { flexDirection: "row", paddingHorizontal: 20, gap: 12, paddingBottom: 8 },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#007AFF",
    alignItems: "center"
  },
  actionBtnDanger: { backgroundColor: "#FFE5E5" },
  actionText: { color: "#FFFFFF", fontWeight: "600" },
  actionTextDanger: { color: "#B00020", fontWeight: "600" },
  list: { padding: 20, gap: 8 },
  row: { backgroundColor: "#F8F8FA", borderRadius: 10, padding: 12 },
  rowError: { borderLeftWidth: 3, borderLeftColor: "#B00020" },
  rowMocked: { backgroundColor: "#FFF8E1" },
  rowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  rowMethodWrap: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  rowMethod: { fontSize: 14, fontWeight: "600", fontFamily: "Courier" },
  badgeMocked: {
    fontSize: 9,
    fontWeight: "700",
    color: "#E65100",
    backgroundColor: "#FFE0B2",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    overflow: "hidden"
  },
  badgeMockReady: {
    fontSize: 9,
    fontWeight: "700",
    color: "#1976D2",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    overflow: "hidden"
  },
  rowStatus: { fontSize: 11, fontWeight: "600" },
  statusOk: { color: "#34C759" },
  statusErr: { color: "#B00020" },
  rowMeta: { fontSize: 11, opacity: 0.6, marginTop: 2 },
  detail: { marginTop: 8, gap: 4 },
  detailLabel: { fontSize: 10, fontWeight: "700", opacity: 0.6, marginTop: 4 },
  detailValue: { fontSize: 12, fontFamily: "Courier" },
  detailActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  detailBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#1C1C1E",
    alignItems: "center"
  },
  detailBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  empty: { textAlign: "center", opacity: 0.5, marginTop: 40 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBody: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 36,
    gap: 12
  },
  modalTitle: { fontSize: 16, fontWeight: "700" },
  modalHint: { fontSize: 12, opacity: 0.6 },
  modalInput: {
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    padding: 12,
    minHeight: 120,
    fontFamily: "Courier",
    fontSize: 12,
    textAlignVertical: "top"
  },
  modalActions: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  modalBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, backgroundColor: "#F2F2F7" },
  modalBtnPrimary: { backgroundColor: "#007AFF" },
  modalBtnDanger: { backgroundColor: "#FFE5E5" },
  modalBtnText: { fontSize: 13, fontWeight: "600" },
  modalBtnTextPrimary: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
  modalBtnTextDanger: { fontSize: 13, fontWeight: "600", color: "#B00020" },
  mockList: { maxHeight: 280 },
  mockRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    gap: 8
  },
  mockRowText: { flex: 1, gap: 2 },
  mockMethod: { fontSize: 13, fontWeight: "600", fontFamily: "Courier" },
  mockResponse: { fontSize: 11, opacity: 0.6, fontFamily: "Courier" },
  mockDelete: { fontSize: 18, color: "#B00020", paddingHorizontal: 6 },
  replayBanner: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    padding: 14,
    borderRadius: 10
  },
  replayBannerOk: { backgroundColor: "#E6F4EA" },
  replayBannerErr: { backgroundColor: "#FFE5E5" },
  replayBannerLabel: { fontSize: 11, fontWeight: "700" },
  replayBannerValue: { fontSize: 12, fontFamily: "Courier", marginTop: 4 }
})

export default RpcInspectorScreen
