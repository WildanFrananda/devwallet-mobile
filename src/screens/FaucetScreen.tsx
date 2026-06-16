import { useEffect, useState, type JSX } from "react"
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useViewModel, useStream, useInit } from "react-native-mobile-mvvm"
import Svg, { Path } from "react-native-svg"
import FaucetViewModel from "../viewmodels/FaucetViewModel"
import FaucetChainCard from "../components/FaucetChainCard"
import DotGridBackground from "../components/DotGridBackground"
import { Chain } from "../core/constants/chains.enum"
import { NetworkRegistry } from "../core/constants/networks"
import { colors, typography, spacing, radius, hairline } from "../theme"

/** Droplet glyph — testnet funds, one tap. */
function DropletIcon({ color }: { color: string }): JSX.Element {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.5c3.2 4 6 6.9 6 10.2a6 6 0 1 1-12 0C6 10.4 8.8 7.5 12 3.5Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/** Ticks every `intervalMs` so rate-limit countdowns re-render live. */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState<number>(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

const ROW_ORDER: ReadonlyArray<Chain> = [
  Chain.EVM_SEPOLIA,
  Chain.EVM_POLYGON_AMOY,
  Chain.EVM_BASE_SEPOLIA,
  Chain.BITCOIN_TESTNET,
  Chain.SOLANA_DEVNET,
  Chain.COSMOS_THETA,
  Chain.XRPL_TESTNET,
  Chain.STARKNET_SEPOLIA
]

/** Stable, unique per-chain slug for Detox testIDs (faucet.row.<slug>.*). */
const TESTID_SLUG: Readonly<Record<Chain, string>> = {
  [Chain.EVM_SEPOLIA]: "sepolia",
  [Chain.EVM_POLYGON_AMOY]: "polygon-amoy",
  [Chain.EVM_BASE_SEPOLIA]: "base-sepolia",
  [Chain.BITCOIN_TESTNET]: "bitcoin",
  [Chain.SOLANA_DEVNET]: "solana",
  [Chain.COSMOS_THETA]: "cosmos",
  [Chain.XRPL_TESTNET]: "xrpl",
  [Chain.STARKNET_SEPOLIA]: "starknet"
}

function FaucetScreen(): JSX.Element {
  const insets = useSafeAreaInsets()
  const vm = useViewModel(FaucetViewModel)
  const rows = useStream(vm.rows$, vm.rows$.value)
  const addresses = useStream(vm.addresses$, vm.addresses$.value)
  const now = useNow(1000)

  useInit(() => vm.initialize(0))

  const isLoadingAddresses = addresses.status === "loading"
  const addressError = addresses.status === "error" ? addresses.message : null
  const addressMap = addresses.status === "success" ? addresses.data : {}

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]} testID="faucet-screen">
      <DotGridBackground />
      <View style={styles.headerBar}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>TESTNET FUNDS · 8 CHAINS</Text>
          <Text style={styles.title}>Faucet</Text>
          <Text style={styles.subtitle}>Drip testnet tokens to every address — one tap.</Text>
        </View>
        <Pressable
          testID="faucet.request-all"
          style={[styles.requestAllBtn, addresses.status !== "success" && styles.requestAllBtnDisabled]}
          onPress={() => vm.requestAll()}
          disabled={addresses.status !== "success"}
        >
          <DropletIcon color={colors.onAccent} />
          <Text style={styles.requestAllLabel}>All</Text>
        </Pressable>
      </View>

      {addressError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{addressError}</Text>
        </View>
      )}

      {isLoadingAddresses ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => vm.initialize(0)} />}
        >
          {ROW_ORDER.map((chain, i) => (
            <FaucetChainCard
              key={chain}
              cfg={NetworkRegistry.get(chain)}
              address={addressMap[chain]}
              row={rows[chain]}
              now={now}
              slug={TESTID_SLUG[chain]}
              index={i}
              onRequest={() => vm.requestSingle(chain)}
            />
          ))}
        </ScrollView>
      )}
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
    alignItems: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm
  },
  headerText: {
    flex: 1,
    gap: spacing.xs
  },
  eyebrow: {
    ...typography.labelXs,
    color: colors.textMuted
  },
  title: {
    ...typography.headlineLg,
    color: colors.textPrimary
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.textSecondary,
    maxWidth: 240
  },
  requestAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3
  },
  requestAllBtnDisabled: {
    opacity: 0.4,
    shadowOpacity: 0
  },
  requestAllLabel: {
    ...typography.monoLabelSm,
    color: colors.onAccent
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
    gap: spacing.md
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
  }
})

export default FaucetScreen
