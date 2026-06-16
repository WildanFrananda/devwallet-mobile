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
import DotGridBackground from "../components/DotGridBackground"
import FadeInView from "../components/FadeInView"
import CountUpText from "../components/CountUpText"
import { Chain } from "../core/constants/chains.enum"
import { NetworkRegistry } from "../core/constants/networks"
import { colors, typography, spacing, radius, hairline, stagger } from "../theme"

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

  useFocusEffect(
    useCallback(() => {
      vm.refreshPortfolio(0)
    }, [vm])
  )

  function onRefresh(): void {
    vm.refreshPortfolio(0)
  }

  function onEntryRendered(chain: Chain, address: string): void {
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
  const networkCount = portfolio ? portfolio.entries.length : 0

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]} testID="dashboard-screen">
      <DotGridBackground />

      <View style={styles.headerBar}>
        <Text style={styles.eyebrow}>PORTFOLIO · {networkCount} NETWORKS</Text>
        <Pressable style={styles.networkBtn} onPress={() => setSelectorOpen(true)}>
          <Text style={styles.networkBtnText}>{selectorLabel} ▾</Text>
        </Pressable>
      </View>

      <View style={styles.totalBox}>
        <CountUpText value={totalUsd} style={styles.totalAmount} />
        <View style={styles.testnetTag}>
          <View style={styles.testnetDot} />
          <Text style={styles.testnetLabel}>TESTNET — NOT REAL VALUE</Text>
        </View>
      </View>

      {errorMessage && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {portfolio === null && errorMessage === null ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />
          }
        >
          {entries.map((e, i) => {
            onEntryRendered(e.account.chain, e.account.address)
            return (
              <FadeInView key={e.account.chain} delay={Math.min(i, 8) * stagger} translateY={12}>
                <BalanceCard
                  testID={`balance-card.${e.account.chain.replace(/:/g, "-")}`}
                  entry={e}
                  loading={false}
                  tokens={tokenMap[e.account.chain]}
                  onPress={() => nav.navigate("TxHistory", { chain: e.account.chain, address: e.account.address })}
                />
              </FadeInView>
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
  safe: {
    flex: 1,
    backgroundColor: colors.background
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm
  },
  eyebrow: {
    ...typography.monoLabelSm,
    color: colors.textMuted
  },
  networkBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: hairline,
    borderColor: colors.border
  },
  networkBtnText: {
    ...typography.monoLabelSm,
    color: colors.textSecondary
  },
  totalBox: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm
  },
  totalAmount: {
    ...typography.headlineLg,
    color: colors.textPrimary
  },
  testnetTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  testnetDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.warning
  },
  testnetLabel: {
    ...typography.monoLabelSm,
    color: colors.warning
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  errorBox: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: hairline,
    borderColor: colors.error,
    backgroundColor: colors.surface
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    textAlign: "center"
  },
  empty: {
    ...typography.monoLabelSm,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xxl
  }
})

export default DashboardScreen
