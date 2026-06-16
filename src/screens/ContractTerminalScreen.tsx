import { useState, type JSX } from "react"
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import { useViewModel, useStream } from "react-native-mobile-mvvm"
import ContractTerminalViewModel from "../viewmodels/ContractTerminalViewModel"
import type Contract from "../models/contract.model"
import type { ContractFunction } from "../models/contract.model"
import { Chain } from "../core/constants/chains.enum"
import { NetworkRegistry } from "../core/constants/networks"
import DotGridBackground from "../components/DotGridBackground"
import { colors, typography, spacing, radius, hairline, chainColors, type ChainColorKey } from "../theme"

function chainLabel(c: Chain): string {
  try {
    return NetworkRegistry.get(c).name
  } catch {
    return c
  }
}

const SUPPORTED_CHAINS: ReadonlyArray<Chain> = [
  Chain.EVM_SEPOLIA,
  Chain.EVM_POLYGON_AMOY,
  Chain.EVM_BASE_SEPOLIA,
  Chain.STARKNET_SEPOLIA,
  Chain.SOLANA_DEVNET
]

function ContractTerminalScreen(): JSX.Element {
  const vm = useViewModel(ContractTerminalViewModel)
  const insets = useSafeAreaInsets()
  const nav = useNavigation()
  const contracts = useStream(vm.contracts$, vm.contracts$.value)
  const selected = useStream(vm.selected$, vm.selected$.value)
  const [adding, setAdding] = useState<boolean>(false)

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <DotGridBackground />
      <View style={styles.headerBar}>
        <Pressable onPress={() => nav.goBack()} hitSlop={8}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Contract Terminal</Text>
        <Pressable onPress={() => setAdding(prev => !prev)} hitSlop={8}>
          <Text style={[styles.headerAction, adding && styles.headerActionCancel]}>{adding ? "Cancel" : "+ Add"}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {adding && <AddContractForm vm={vm} onDone={() => setAdding(false)} />}

        {!adding && selected === null && (
          <>
            {contracts.length === 0 ? (
              <Text style={styles.empty}>No contracts saved. Tap “+ Add” to paste an ABI.</Text>
            ) : (
              contracts.map(c => (
                <ContractRow
                  key={c.id}
                  contract={c}
                  onSelect={() => vm.select(c)}
                  onDelete={() => {
                    Alert.alert("Delete contract?", c.name, [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => vm.deleteContract(c.id) }
                    ])
                  }}
                />
              ))
            )}
          </>
        )}

        {!adding && selected !== null && <ContractDetail vm={vm} contract={selected} />}
      </ScrollView>
    </View>
  )
}

function AddContractForm({
  vm,
  onDone
}: {
  vm: ContractTerminalViewModel
  onDone: () => void
}): JSX.Element {
  const form = useStream(vm.addForm$, vm.addForm$.value)
  const state = useStream(vm.addState$, vm.addState$.value)

  function onSubmit(): void {
    vm.submitAdd()
    if (vm.addState$.value.status === "success") {
      vm.resetAddState()
      onDone()
    }
  }

  return (
    <View style={styles.form}>
      <Text style={styles.formTitle}>Add contract</Text>

      <Text style={styles.label}>CHAIN</Text>
      <View style={styles.chipRow}>
        {SUPPORTED_CHAINS.map(c => {
          const active = form.chain === c
          const hue = chainColors[c as ChainColorKey] ?? colors.border
          return (
            <Pressable
              key={c}
              style={[styles.chip, active && { backgroundColor: hue + "1f", borderColor: hue }]}
              onPress={() => vm.setAddField("chain", c)}
            >
              <View style={[styles.chipDot, { backgroundColor: hue }]} />
              <Text style={[styles.chipText, active && { color: colors.textPrimary }]}>{chainLabel(c)}</Text>
            </Pressable>
          )
        })}
      </View>

      <Text style={styles.label}>ADDRESS</Text>
      <TextInput
        style={[styles.input, styles.mono]}
        placeholder="0x…"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        value={form.address}
        onChangeText={(v: string) => vm.setAddField("address", v)}
      />

      <Text style={styles.label}>DISPLAY NAME (OPTIONAL)</Text>
      <TextInput
        style={styles.input}
        placeholder="My Token"
        placeholderTextColor={colors.textMuted}
        value={form.name}
        onChangeText={(v: string) => vm.setAddField("name", v)}
      />

      <Text style={styles.label}>ABI (JSON)</Text>
      <TextInput
        style={[styles.input, styles.abi]}
        placeholder='[{ "type": "function", "name": "...", "inputs": [...] }]'
        placeholderTextColor={colors.textMuted}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        value={form.rawAbi}
        onChangeText={(v: string) => vm.setAddField("rawAbi", v)}
      />

      {state.status === "error" && <Text style={styles.errorText}>{state.message}</Text>}

      <Pressable style={styles.primaryBtn} onPress={onSubmit}>
        <Text style={styles.primaryBtnText}>Save</Text>
      </Pressable>
    </View>
  )
}

function ContractRow({
  contract,
  onSelect,
  onDelete
}: {
  contract: Contract
  onSelect: () => void
  onDelete: () => void
}): JSX.Element {
  const hue = chainColors[contract.chain as ChainColorKey] ?? colors.border
  return (
    <Pressable style={[styles.row, { borderColor: hue + "33" }]} onPress={onSelect} onLongPress={onDelete}>
      <View style={styles.rowNameLine}>
        <View style={[styles.chipDot, { backgroundColor: hue }]} />
        <Text style={styles.rowName}>{contract.name}</Text>
      </View>
      <Text style={styles.rowMeta}>
        {chainLabel(contract.chain)} · {contract.abiKind.toUpperCase()} · {contract.functions.length} fns
      </Text>
      <Text style={styles.rowAddr} numberOfLines={1}>
        {contract.address}
      </Text>
    </Pressable>
  )
}

function ContractDetail({
  vm,
  contract
}: {
  vm: ContractTerminalViewModel
  contract: Contract
}): JSX.Element {
  const outcome = useStream(vm.callOutcome$, vm.callOutcome$.value)
  const argInputs = useStream(vm.argInputs$, vm.argInputs$.value)
  const [tab, setTab] = useState<"read" | "write">("read")
  const reads = contract.functions.filter(fn => contract.isRead(fn))
  const writes = contract.functions.filter(fn => !contract.isRead(fn))
  const shown = tab === "read" ? reads : writes

  return (
    <View>
      <Pressable onPress={() => vm.select(null)}>
        <Text style={styles.back}>‹ All contracts</Text>
      </Pressable>
      <Text style={styles.detailTitle}>{contract.name}</Text>
      <Text style={styles.detailMeta}>{contract.address}</Text>

      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, tab === "read" && styles.tabActive]}
          onPress={() => setTab("read")}
        >
          <Text style={[styles.tabText, tab === "read" && styles.tabTextActive]}>
            Read · {reads.length}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === "write" && styles.tabActive]}
          onPress={() => setTab("write")}
        >
          <Text style={[styles.tabText, tab === "write" && styles.tabTextActive]}>
            Write · {writes.length}
          </Text>
        </Pressable>
      </View>

      {shown.length === 0 && (
        <Text style={styles.empty}>
          No {tab} functions in this ABI.
        </Text>
      )}

      {shown.map(fn => (
        <FunctionRow
          key={`${fn.name}-${fn.inputs.length}`}
          fn={fn}
          isRead={contract.isRead(fn)}
          inputs={argInputs[fn.name] ?? []}
          onChange={(i, v) => vm.setArg(fn.name, i, v)}
          onRun={() => vm.callFunction(fn)}
        />
      ))}

      {outcome.kind === "loading" && (
        <View style={styles.outcomeBox}>
          <ActivityIndicator />
        </View>
      )}
      {outcome.kind === "result" && (
        <View style={styles.outcomeBox}>
          <Text style={styles.outcomeLabel}>Result</Text>
          <Text style={styles.outcomeValue}>{outcome.value}</Text>
        </View>
      )}
      {outcome.kind === "tx" && (
        <View style={styles.outcomeBox}>
          <Text style={styles.outcomeLabel}>Tx submitted</Text>
          <Text style={styles.outcomeValue}>{outcome.hash}</Text>
        </View>
      )}
      {outcome.kind === "error" && (
        <View style={[styles.outcomeBox, styles.outcomeBoxError]}>
          <Text style={styles.outcomeLabel}>Error</Text>
          <Text style={[styles.outcomeValue, styles.errorText]}>{outcome.message}</Text>
        </View>
      )}
    </View>
  )
}

function FunctionRow({
  fn,
  isRead,
  inputs,
  onChange,
  onRun
}: {
  fn: ContractFunction
  isRead: boolean
  inputs: ReadonlyArray<string>
  onChange: (i: number, v: string) => void
  onRun: () => void
}): JSX.Element {
  return (
    <View style={styles.fnBox}>
      <View style={styles.fnHeader}>
        <Text style={styles.fnName}>{fn.name}</Text>
        <Text style={[styles.fnTag, isRead ? styles.tagRead : styles.tagWrite]}>{isRead ? "READ" : "WRITE"}</Text>
      </View>
      {fn.inputs.map((param, i) => (
        <View key={`${param.name}-${i}`} style={styles.argRow}>
          <Text style={styles.argLabel}>
            {param.name || `arg${i}`}: {param.type}
          </Text>
          <TextInput
            style={styles.argInput}
            value={inputs[i] ?? ""}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(v: string) => onChange(i, v)}
          />
        </View>
      ))}
      <Pressable style={[styles.runBtn, isRead ? styles.runRead : styles.runWrite]} onPress={onRun}>
        <Text style={styles.runText}>{isRead ? "Call" : "Send"}</Text>
      </Pressable>
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
  headerAction: { ...typography.monoLabelSm, color: colors.accentText },
  headerActionCancel: { color: colors.textMuted },
  body: { padding: spacing.lg, gap: spacing.md },
  empty: { ...typography.bodyMd, color: colors.textMuted, textAlign: "center", marginTop: 40 },
  form: { gap: spacing.sm },
  formTitle: { ...typography.titleMd, color: colors.textPrimary, marginBottom: spacing.xs },
  label: { ...typography.labelXs, color: colors.textMuted, marginTop: spacing.sm },
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
  abi: { minHeight: 140, ...typography.monoDataSm, color: colors.textPrimary, textAlignVertical: "top" },
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
  primaryBtnText: { ...typography.monoLabelSm, fontSize: 13, color: colors.onAccent },
  errorText: { ...typography.monoDataSm, color: colors.error },
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
  row: {
    padding: spacing.md,
    backgroundColor: colors.elevation1,
    borderRadius: radius.lg,
    borderWidth: hairline,
    borderColor: colors.border,
    gap: spacing.xxs
  },
  rowNameLine: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rowName: { ...typography.titleMd, color: colors.textPrimary },
  rowMeta: { ...typography.monoDataSm, color: colors.textMuted },
  rowAddr: { ...typography.monoDataSm, color: colors.textSecondary },
  detailTitle: { ...typography.headlineLg, color: colors.textPrimary, marginTop: spacing.md },
  detailMeta: { ...typography.monoDataSm, color: colors.textMuted, marginBottom: spacing.md },
  fnBox: {
    backgroundColor: colors.elevation1,
    borderRadius: radius.lg,
    borderWidth: hairline,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm
  },
  fnHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fnName: { ...typography.monoDataSm, fontSize: 14, color: colors.textPrimary, flexShrink: 1 },
  fnTag: {
    ...typography.labelXs,
    fontSize: 10,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.xs,
    overflow: "hidden"
  },
  tagRead: { backgroundColor: colors.info + "26", color: colors.info },
  tagWrite: { backgroundColor: colors.accentWarm + "26", color: colors.accentWarm },
  argRow: { gap: spacing.xxs },
  argLabel: { ...typography.monoDataSm, color: colors.textMuted },
  argInput: {
    backgroundColor: colors.elevation0,
    borderWidth: hairline,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    ...typography.monoDataSm,
    color: colors.textPrimary
  },
  runBtn: { paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: "center", marginTop: spacing.xs },
  runRead: { backgroundColor: colors.info + "1f", borderWidth: hairline, borderColor: colors.info + "66" },
  runWrite: { backgroundColor: colors.accentWarm + "1f", borderWidth: hairline, borderColor: colors.accentWarm + "66" },
  runText: { ...typography.monoLabelSm, color: colors.textPrimary },
  tabBar: { flexDirection: "row", marginTop: spacing.md, marginBottom: spacing.sm, gap: spacing.sm },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: hairline,
    borderColor: colors.border,
    backgroundColor: colors.elevation1
  },
  tabActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabText: { ...typography.monoLabelSm, color: colors.textSecondary },
  tabTextActive: { color: colors.onAccent },
  outcomeBox: {
    padding: spacing.md,
    backgroundColor: colors.elevation1,
    borderWidth: hairline,
    borderColor: colors.border,
    borderRadius: radius.lg,
    marginTop: spacing.md,
    gap: spacing.xs
  },
  outcomeBoxError: { backgroundColor: colors.error + "14", borderColor: colors.error + "55" },
  outcomeLabel: { ...typography.labelXs, color: colors.textMuted },
  outcomeValue: { ...typography.monoDataSm, color: colors.textSecondary }
})

export default ContractTerminalScreen
