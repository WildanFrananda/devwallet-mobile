import Config from "react-native-config"
import { Chain } from "./chains.enum"
import type { ReplayOriginChain } from "../../models/replay.model"

type ReplaySourceConfig = {
  chain: ReplayOriginChain
  name: string
  rpcUrl: string
  explorerTxUrl: (hash: string) => string
  /** Testnet pair that the executor defaults to when no override is set. */
  testnetPair: Chain
}

/**
 * Mainnet RPC resolution for the read-only replay decoder. Prefers Alchemy
 * (the same account-wide key used for testnets works across networks by
 * swapping the subdomain) and falls back to a keyless public endpoint.
 *
 * Why Alchemy first: public RPCs (PublicNode/Cloudflare/llamarpc) advertise
 * `alt-svc: h3` (HTTP/3), and the iOS Simulator's QUIC stack can stall the
 * first connection → endless spinner. Alchemy serves over HTTP/2 only (no
 * h3 push), so it sidesteps that entirely and isn't rate-limited.
 */
function mainnetRpc(alchemyKey: string | undefined, alchemySubdomain: string, publicFallback: string): string {
  const key = alchemyKey?.trim()
  if (key && key.length > 0) return `https://${alchemySubdomain}.g.alchemy.com/v2/${key}`
  return publicFallback
}

/**
 * Read-only mainnet RPCs used by the TX Replay decoder. NEVER sign with
 * these endpoints — the executor uses the user-selected testnet pair for
 * the actual broadcast.
 */
const REPLAY_SOURCES: Record<ReplayOriginChain, ReplaySourceConfig> = {
  ethereum: {
    chain: "ethereum",
    name: "Ethereum Mainnet",
    rpcUrl: mainnetRpc(Config.ALCHEMY_API_KEY_SEPOLIA, "eth-mainnet", "https://ethereum-rpc.publicnode.com"),
    explorerTxUrl: h => `https://etherscan.io/tx/${h}`,
    testnetPair: Chain.EVM_SEPOLIA
  },
  polygon: {
    chain: "polygon",
    name: "Polygon Mainnet",
    rpcUrl: mainnetRpc(Config.ALCHEMY_API_KEY_AMOY, "polygon-mainnet", "https://polygon-bor-rpc.publicnode.com"),
    explorerTxUrl: h => `https://polygonscan.com/tx/${h}`,
    testnetPair: Chain.EVM_POLYGON_AMOY
  },
  base: {
    chain: "base",
    name: "Base Mainnet",
    rpcUrl: mainnetRpc(Config.ALCHEMY_API_KEY_BASE, "base-mainnet", "https://base-rpc.publicnode.com"),
    explorerTxUrl: h => `https://basescan.org/tx/${h}`,
    testnetPair: Chain.EVM_BASE_SEPOLIA
  }
}

const REPLAY_ORIGINS: ReadonlyArray<ReplayOriginChain> = ["ethereum", "polygon", "base"]
const REPLAY_TARGET_CHAINS: ReadonlyArray<Chain> = [
  Chain.EVM_SEPOLIA,
  Chain.EVM_POLYGON_AMOY,
  Chain.EVM_BASE_SEPOLIA
]

function sourceFor(origin: ReplayOriginChain): ReplaySourceConfig {
  return REPLAY_SOURCES[origin]
}

export { REPLAY_SOURCES, REPLAY_ORIGINS, REPLAY_TARGET_CHAINS, sourceFor }
export type { ReplaySourceConfig }
