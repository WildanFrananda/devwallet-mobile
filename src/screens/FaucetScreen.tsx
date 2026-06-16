import { useEffect, useState, type JSX } from "react"
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useViewModel, useStream, useInit } from "react-native-mobile-mvvm"
import FaucetViewModel from "../viewmodels/FaucetViewModel"
import FaucetChainCard from "../components/FaucetChainCard"
import { Chain } from "../core/constants/chains.enum"
import { NetworkRegistry } from "../core/constants/networks"

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
    <View
      style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      testID="faucet-screen"
    >
      <View style={styles.headerBar}>
        <Text style={styles.title}>Faucet</Text>
        <Pressable
          testID="faucet.request-all"
          style={[styles.requestAllBtn, addresses.status !== "success" && styles.requestAllBtnDisabled]}
          onPress={() => vm.requestAll()}
          disabled={addresses.status !== "success"}
        >
          <Text style={styles.requestAllLabel}>Request all</Text>
        </Pressable>
      </View>

      {addressError && <Text style={styles.error}>{addressError}</Text>}

      {isLoadingAddresses ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => vm.initialize(0)} />}
        >
          {ROW_ORDER.map(chain => (
            <FaucetChainCard
              key={chain}
              cfg={NetworkRegistry.get(chain)}
              address={addressMap[chain]}
              row={rows[chain]}
              now={now}
              slug={TESTID_SLUG[chain]}
              onRequest={() => vm.requestSingle(chain)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F8FA" },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12
  },
  title: { fontSize: 24, fontWeight: "700" },
  requestAllBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#007AFF",
    borderRadius: 8
  },
  requestAllBtnDisabled: { backgroundColor: "#A8C7FA" },
  requestAllLabel: { color: "#FFFFFF", fontWeight: "600", fontSize: 13 },
  list: { padding: 16, gap: 10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { color: "#B00020", paddingHorizontal: 20, paddingVertical: 8, textAlign: "center" }
})

export default FaucetScreen
