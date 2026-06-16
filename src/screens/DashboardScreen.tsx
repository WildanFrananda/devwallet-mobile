import { useCallback, useState, type JSX } from "react"
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, ActivityIndicator } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useFocusEffect, useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { useViewModel, useStream, useInit } from "react-native-mobile-mvvm"
import type { AppStackParamList } from "../navigation/AppNavigator"
import WalletViewModel from "../viewmodels/WalletViewModel"
import BalanceCard from "../components/BalanceCard"
import NetworkSelector from "../components/NetworkSelector"
import { Chain } from "../core/constants/chains.enum"
import { NetworkRegistry } from "../core/constants/networks"

type AppNav = NativeStackNavigationProp<AppStackParamList>

function DashboardScreen(): JSX.Element {
  const vm = useViewModel(WalletViewModel)
  const nav = useNavigation<AppNav>()
  const insets = useSafeAreaInsets()
  const state = useStream(vm.portfolio$, vm.portfolio$.value)
  const tokenMap = useStream(vm.tokens$, vm.tokens$.value)
  const isRefreshing = useStream(vm.isRefreshing$, vm.isRefreshing$.value)
  const totalUsd = useStream(vm.totalUsd$, vm.totalUsd$.value)
  const [selectorOpen, setSelectorOpen] = useState<boolean>(false)
  const [chainFilter, setChainFilter] = useState<Chain | "all">("all")

  useInit(() => {
    vm.loadPortfolio(0)
    vm.startAutoRefresh()
  })

  // Refresh whenever Wallet tab regains focus (e.g. after Faucet roundtrip).
  // Silent — keep the rendered list painted while the new fetch resolves.
  useFocusEffect(
    useCallback(() => {
      vm.refreshPortfolio(0)
    }, [vm])
  )

  function onRefresh(): void {
    vm.refreshPortfolio(0)
  }

  function onEntryRendered(chain: Chain, address: string): void {
    // Lazy fetch tokens once per chain; refresh manually by pull-to-refresh.
    if (tokenMap[chain] === undefined) {
      vm.loadTokens(chain, address)
    }
  }

  const portfolio = state.status === "success" ? state.data : null
  const errorMessage = state.status === "error" ? state.message : null

  const entries = portfolio
    ? chainFilter === "all"
      ? portfolio.entries
      : portfolio.entries.filter(e => e.account.chain === chainFilter)
    : []

  const selectorLabel = chainFilter === "all" ? "All networks" : NetworkRegistry.get(chainFilter).name

  return (
    <View
      style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      testID="dashboard-screen"
    >
      <View style={styles.headerBar}>
        <Text style={styles.title}>Portfolio</Text>
        <Pressable style={styles.networkBtn} onPress={() => setSelectorOpen(true)}>
          <Text style={styles.networkBtnText}>{selectorLabel} ▾</Text>
        </Pressable>
      </View>

      {totalUsd !== null && (
        <View style={styles.totalBox}>
          <Text style={styles.totalAmount}>
            ${totalUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text style={styles.totalLabel}>TESTNET — not real value</Text>
        </View>
      )}

      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

      {portfolio === null && errorMessage === null ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        >
          {entries.map(e => {
            onEntryRendered(e.account.chain, e.account.address)
            return (
              <BalanceCard
                key={e.account.chain}
                testID={`balance-card.${e.account.chain.replace(/:/g, "-")}`}
                entry={e}
                loading={false}
                tokens={tokenMap[e.account.chain]}
                onPress={() => nav.navigate("TxHistory", { chain: e.account.chain, address: e.account.address })}
              />
            )
          })}
          {portfolio !== null && entries.length === 0 && (
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
    </View>
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
  totalBox: { alignItems: "center", paddingHorizontal: 20, paddingBottom: 8 },
  totalAmount: { fontSize: 32, fontWeight: "700" },
  totalLabel: { fontSize: 11, color: "#B27800", fontWeight: "600", marginTop: 2, letterSpacing: 0.5 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { color: "#B00020", paddingHorizontal: 20, paddingVertical: 8, textAlign: "center" },
  empty: { textAlign: "center", opacity: 0.5, marginTop: 32 }
})

export default DashboardScreen
