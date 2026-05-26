import { useCallback, useState, type JSX } from "react"
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useFocusEffect } from "@react-navigation/native"
import { useViewModel, useStream, useInit } from "react-native-mobile-mvvm"
import WalletViewModel from "../viewmodels/WalletViewModel"
import BalanceCard from "../components/BalanceCard"
import NetworkSelector from "../components/NetworkSelector"
import { Chain } from "../core/constants/chains.enum"
import { NetworkRegistry } from "../core/constants/networks"

function DashboardScreen(): JSX.Element {
  const vm = useViewModel(WalletViewModel)
  const state = useStream(vm.portfolio$, vm.portfolio$.value)
  const tokenMap = useStream(vm.tokens$, vm.tokens$.value)
  const [selectorOpen, setSelectorOpen] = useState<boolean>(false)
  const [chainFilter, setChainFilter] = useState<Chain | "all">("all")

  useInit(() => {
    vm.loadPortfolio(0)
    vm.startAutoRefresh()
  })

  // Refresh whenever Wallet tab regains focus (e.g. after Faucet roundtrip).
  useFocusEffect(
    useCallback(() => {
      vm.loadPortfolio(0)
    }, [vm])
  )

  function onRefresh(): void {
    vm.loadPortfolio(0)
  }

  function onEntryRendered(chain: Chain, address: string): void {
    // Lazy fetch tokens once per chain; refresh manually by pull-to-refresh.
    if (tokenMap[chain] === undefined) {
      vm.loadTokens(chain, address)
    }
  }

  const isLoading = state.status === "loading"
  const portfolio = state.status === "success" ? state.data : null
  const errorMessage = state.status === "error" ? state.message : null

  const entries = portfolio
    ? chainFilter === "all"
      ? portfolio.entries
      : portfolio.entries.filter(e => e.account.chain === chainFilter)
    : []

  const selectorLabel = chainFilter === "all" ? "All networks" : NetworkRegistry.get(chainFilter).name

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.headerBar}>
        <Text style={styles.title}>Portfolio</Text>
        <Pressable style={styles.networkBtn} onPress={() => setSelectorOpen(true)}>
          <Text style={styles.networkBtnText}>{selectorLabel} ▾</Text>
        </Pressable>
      </View>

      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

      {isLoading && portfolio === null ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        >
          {entries.map(e => {
            onEntryRendered(e.account.chain, e.account.address)
            return (
              <BalanceCard key={e.account.chain} entry={e} loading={isLoading} tokens={tokenMap[e.account.chain]} />
            )
          })}
          {entries.length === 0 && !isLoading && (
            <Text style={styles.empty}>No entries{chainFilter === "all" ? "" : " for selected network"}</Text>
          )}
        </ScrollView>
      )}

      <NetworkSelector
        visible={selectorOpen}
        selected={chainFilter}
        onSelect={setChainFilter}
        onClose={() => setSelectorOpen(false)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12
  },
  title: { fontSize: 24, fontWeight: "700" },
  networkBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F2F2F7",
    borderRadius: 8
  },
  networkBtnText: { fontSize: 13, fontWeight: "500" },
  list: { padding: 20, gap: 10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { color: "#B00020", paddingHorizontal: 20, paddingVertical: 8, textAlign: "center" },
  empty: { textAlign: "center", opacity: 0.5, marginTop: 32 }
})

export default DashboardScreen
