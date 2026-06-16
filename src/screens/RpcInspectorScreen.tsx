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
import DotGridBackground from "../components/DotGridBackground"
import { colors, typography, spacing, radius, hairline, chainColors, type ChainColorKey } from "../theme"

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
    <View
      style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      testID="rpc-inspector-screen"
    >
      <DotGridBackground />
      <View style={styles.headerBar}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>DEVKIT · RPC</Text>
          <Text style={styles.title}>RPC Inspector</Text>
          <Text style={styles.subtitle}>
            {logs.length} / {count} entries
          </Text>
        </View>
        <Pressable style={styles.mockChip} onPress={() => setMocksOpen(true)}>
          <View style={styles.mockChipDot} />
          <Text style={styles.mockChipText}>Mocks · {mocks.length}</Text>
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          style={styles.search}
          placeholder="Filter method or endpoint…"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          value={searchQuery}
          onChangeText={vm.setSearchQuery.bind(vm)}
        />
      </View>

      <View style={styles.chainRow}>
        {CHAIN_OPTIONS.map(opt => (
          <Pressable
            key={opt.value}
            style={[styles.chip, chainFilter === opt.value && styles.chipActive]}
            onPress={() => vm.setChainFilter(opt.value)}
          >
            <Text style={[styles.chipText, chainFilter === opt.value && styles.chipTextActive]}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.statusRow}>
        {STATUS_OPTIONS.map(opt => (
          <Pressable
            key={opt.value}
            style={[styles.chip, statusFilter === opt.value && styles.chipActive]}
            onPress={() => vm.setStatusFilter(opt.value)}
          >
            <Text style={[styles.chipText, statusFilter === opt.value && styles.chipTextActive]}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>

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
        renderItem={({ item, index }) => (
          <LogRow
            log={item}
            index={index}
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
  index,
  expanded,
  mockMethods,
  onToggle,
  onLongPress,
  onReplay
}: {
  log: RpcLog
  index: number
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
  const hue = chainColors[log.chain as ChainColorKey] ?? colors.border
  return (
    <Pressable
      testID={`rpc-inspector.log-row.${index}`}
      style={[styles.row, log.status === "error" && styles.rowError, log.mocked && styles.rowMocked]}
      onPress={onToggle}
      onLongPress={onLongPress}
    >
      <View style={styles.rowHeader}>
        <View style={styles.rowMethodWrap}>
          <View style={[styles.chainDot, { backgroundColor: hue }]} />
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
        <View style={styles.detail} testID="rpc-log-detail.json">
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
            <Pressable testID="rpc-log-detail.replay" style={styles.detailBtn} onPress={onReplay}>
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
            placeholderTextColor={colors.textMuted}
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
      testID="rpc-log-detail.replay-result"
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
  safe: { flex: 1, backgroundColor: colors.background },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm
  },
  headerText: { flex: 1, gap: spacing.xxs },
  eyebrow: { ...typography.labelXs, color: colors.textMuted },
  title: { ...typography.headlineLg, color: colors.textPrimary },
  subtitle: { ...typography.monoDataSm, color: colors.textMuted },
  mockChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.accentWarm + "1a",
    borderWidth: hairline,
    borderColor: colors.accentWarm + "55",
    borderRadius: radius.full
  },
  mockChipDot: { width: 6, height: 6, borderRadius: radius.full, backgroundColor: colors.accentWarm },
  mockChipText: { ...typography.monoLabelSm, color: colors.accentWarm },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.elevation1,
    borderWidth: hairline,
    borderColor: colors.border,
    borderRadius: radius.md
  },
  searchIcon: { fontSize: 16, color: colors.textMuted },
  search: {
    // System (proportional) font + letterSpacing 0: a monospace or any inherited
    // tracking makes plain-English placeholders read as stretched/"melar".
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: 14,
    letterSpacing: 0,
    color: colors.textPrimary
  },
  chainRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm
  },
  statusRow: {
    flexDirection: "row",
    gap: spacing.xs,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.elevation1,
    borderWidth: hairline,
    borderColor: colors.border,
    borderRadius: radius.full
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { ...typography.monoLabelSm, letterSpacing: 0.3, color: colors.textSecondary },
  chipTextActive: { color: colors.onAccent },
  actionRow: { flexDirection: "row", paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm },
  actionBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: hairline,
    borderColor: colors.border,
    backgroundColor: colors.elevation1,
    alignItems: "center"
  },
  actionBtnDanger: { borderColor: colors.error + "55", backgroundColor: colors.error + "14" },
  actionText: { ...typography.monoLabelSm, color: colors.accentText },
  actionTextDanger: { ...typography.monoLabelSm, color: colors.error },
  list: { padding: spacing.lg, gap: spacing.sm },
  row: {
    backgroundColor: colors.elevation1,
    borderRadius: radius.lg,
    borderWidth: hairline,
    borderColor: colors.border,
    padding: spacing.md
  },
  rowError: { borderLeftWidth: 3, borderLeftColor: colors.error },
  rowMocked: { borderColor: colors.accentWarm + "55", backgroundColor: colors.accentWarm + "0d" },
  rowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  rowMethodWrap: { flexDirection: "row", alignItems: "center", gap: spacing.xs, flexShrink: 1 },
  chainDot: { width: 7, height: 7, borderRadius: radius.full },
  rowMethod: { ...typography.monoDataSm, fontSize: 13, color: colors.textPrimary, flexShrink: 1 },
  badgeMocked: {
    ...typography.labelXs,
    fontSize: 9,
    color: colors.accentWarm,
    backgroundColor: colors.accentWarm + "26",
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: radius.xs,
    overflow: "hidden"
  },
  badgeMockReady: {
    ...typography.labelXs,
    fontSize: 9,
    color: colors.info,
    backgroundColor: colors.info + "26",
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: radius.xs,
    overflow: "hidden"
  },
  rowStatus: { ...typography.monoLabelSm, fontSize: 11 },
  statusOk: { color: colors.success },
  statusErr: { color: colors.error },
  rowMeta: { ...typography.monoDataSm, color: colors.textMuted, marginTop: spacing.xxs },
  detail: {
    marginTop: spacing.sm,
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: hairline,
    borderTopColor: colors.border
  },
  detailLabel: { ...typography.labelXs, color: colors.textMuted, marginTop: spacing.xs },
  detailValue: { ...typography.monoDataSm, color: colors.textSecondary },
  detailActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  detailBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: hairline,
    borderColor: colors.border,
    backgroundColor: colors.elevation2,
    alignItems: "center"
  },
  detailBtnText: { ...typography.monoLabelSm, color: colors.accentText },
  empty: { ...typography.bodyMd, color: colors.textMuted, textAlign: "center", marginTop: 40 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalBody: {
    backgroundColor: colors.elevation2,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: hairline,
    borderColor: colors.border,
    padding: spacing.lg,
    paddingBottom: 36,
    gap: spacing.md
  },
  modalTitle: { ...typography.titleMd, color: colors.textPrimary },
  modalHint: { ...typography.bodyMd, color: colors.textSecondary },
  modalInput: {
    backgroundColor: colors.elevation0,
    borderWidth: hairline,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 120,
    ...typography.monoDataSm,
    color: colors.textPrimary,
    textAlignVertical: "top"
  },
  modalActions: { flexDirection: "row", gap: spacing.sm, justifyContent: "flex-end" },
  modalBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: hairline,
    borderColor: colors.border,
    backgroundColor: colors.elevation1
  },
  modalBtnPrimary: { backgroundColor: colors.accent, borderColor: colors.accent },
  modalBtnDanger: { backgroundColor: colors.error + "14", borderColor: colors.error + "55" },
  modalBtnText: { ...typography.monoLabelSm, color: colors.textSecondary },
  modalBtnTextPrimary: { ...typography.monoLabelSm, color: colors.onAccent },
  modalBtnTextDanger: { ...typography.monoLabelSm, color: colors.error },
  mockList: { maxHeight: 280 },
  mockRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: hairline,
    borderBottomColor: colors.border,
    gap: spacing.sm
  },
  mockRowText: { flex: 1, gap: spacing.xxs },
  mockMethod: { ...typography.monoDataSm, fontSize: 13, color: colors.textPrimary },
  mockResponse: { ...typography.monoDataSm, color: colors.textMuted },
  mockDelete: { fontSize: 18, color: colors.error, paddingHorizontal: spacing.xs },
  replayBanner: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: hairline
  },
  replayBannerOk: { backgroundColor: colors.successGlow, borderColor: colors.success + "55" },
  replayBannerErr: { backgroundColor: colors.error + "14", borderColor: colors.error + "55" },
  replayBannerLabel: { ...typography.monoLabelSm, color: colors.textPrimary },
  replayBannerValue: { ...typography.monoDataSm, color: colors.textSecondary, marginTop: spacing.xxs }
})

export default RpcInspectorScreen
