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
      <View style={styles.headerBar}>
        <Pressable onPress={() => nav.goBack()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Contract Terminal</Text>
        <Pressable onPress={() => setAdding(prev => !prev)}>
          <Text style={styles.headerAction}>{adding ? "Cancel" : "+ Add"}</Text>
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

      <Text style={styles.label}>Chain</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {SUPPORTED_CHAINS.map(c => (
          <Pressable
            key={c}
            style={[styles.chip, form.chain === c && styles.chipActive]}
            onPress={() => vm.setAddField("chain", c)}
          >
            <Text style={[styles.chipText, form.chain === c && styles.chipTextActive]}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.label}>Address</Text>
      <TextInput
        style={styles.input}
        placeholder="0x…"
        autoCapitalize="none"
        autoCorrect={false}
        value={form.address}
        onChangeText={(v: string) => vm.setAddField("address", v)}
      />

      <Text style={styles.label}>Display name (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="My Token"
        value={form.name}
        onChangeText={(v: string) => vm.setAddField("name", v)}
      />

      <Text style={styles.label}>ABI (JSON)</Text>
      <TextInput
        style={[styles.input, styles.abi]}
        placeholder='[{ "type": "function", "name": "...", "inputs": [...] }]'
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
  return (
    <Pressable style={styles.row} onPress={onSelect} onLongPress={onDelete}>
      <Text style={styles.rowName}>{contract.name}</Text>
      <Text style={styles.rowMeta}>
        {contract.chain} · {contract.abiKind.toUpperCase()} · {contract.functions.length} fns
      </Text>
      <Text style={styles.rowAddr}>{contract.address}</Text>
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
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  back: { color: "#007AFF", fontSize: 14 },
  title: { fontSize: 18, fontWeight: "700" },
  headerAction: { color: "#007AFF", fontSize: 14, fontWeight: "600" },
  body: { padding: 16, gap: 12 },
  empty: { textAlign: "center", opacity: 0.5, marginTop: 40 },
  form: { gap: 8 },
  formTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  label: { fontSize: 12, fontWeight: "600", opacity: 0.6, marginTop: 8 },
  input: {
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14
  },
  abi: { minHeight: 140, fontFamily: "Courier", fontSize: 12, textAlignVertical: "top" },
  primaryBtn: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "600" },
  errorText: { color: "#B00020" },
  chipRow: { gap: 8, paddingVertical: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#F2F2F7", borderRadius: 16 },
  chipActive: { backgroundColor: "#007AFF" },
  chipText: { fontSize: 11, color: "#1C1C1E" },
  chipTextActive: { color: "#FFFFFF" },
  row: { padding: 12, backgroundColor: "#F8F8FA", borderRadius: 10, gap: 4 },
  rowName: { fontSize: 14, fontWeight: "600" },
  rowMeta: { fontSize: 11, opacity: 0.6 },
  rowAddr: { fontSize: 11, fontFamily: "Courier" },
  detailTitle: { fontSize: 18, fontWeight: "700", marginTop: 12 },
  detailMeta: { fontSize: 11, fontFamily: "Courier", opacity: 0.6, marginBottom: 12 },
  fnBox: { backgroundColor: "#F8F8FA", borderRadius: 10, padding: 12, marginBottom: 12, gap: 8 },
  fnHeader: { flexDirection: "row", justifyContent: "space-between" },
  fnName: { fontSize: 14, fontWeight: "600", fontFamily: "Courier" },
  fnTag: { fontSize: 10, fontWeight: "700", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagRead: { backgroundColor: "#E3F2FD", color: "#1976D2" },
  tagWrite: { backgroundColor: "#FFF3E0", color: "#E65100" },
  argRow: { gap: 4 },
  argLabel: { fontSize: 11, opacity: 0.7 },
  argInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    fontFamily: "Courier"
  },
  runBtn: { paddingVertical: 8, borderRadius: 6, alignItems: "center" },
  runRead: { backgroundColor: "#1976D2" },
  runWrite: { backgroundColor: "#E65100" },
  runText: { color: "#FFFFFF", fontWeight: "600" },
  tabBar: { flexDirection: "row", marginTop: 12, marginBottom: 8, gap: 8 },
  tab: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8, backgroundColor: "#F2F2F7" },
  tabActive: { backgroundColor: "#007AFF" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#1C1C1E" },
  tabTextActive: { color: "#FFFFFF" },
  outcomeBox: { padding: 12, backgroundColor: "#F2F2F7", borderRadius: 10, marginTop: 12, gap: 4 },
  outcomeBoxError: { backgroundColor: "#FFE5E5" },
  outcomeLabel: { fontSize: 11, fontWeight: "700", opacity: 0.6 },
  outcomeValue: { fontSize: 13, fontFamily: "Courier" }
})

export default ContractTerminalScreen
