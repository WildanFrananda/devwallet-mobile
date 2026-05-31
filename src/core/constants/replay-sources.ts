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
 * Read-only mainnet RPCs used by the TX Replay decoder. NEVER sign with
 * these endpoints — the executor uses the user-selected testnet pair for
 * the actual broadcast.
 */
const REPLAY_SOURCES: Record<ReplayOriginChain, ReplaySourceConfig> = {
  ethereum: {
    chain: "ethereum",
    name: "Ethereum Mainnet",
    rpcUrl: "https://eth.public-rpc.com",
    explorerTxUrl: h => `https://etherscan.io/tx/${h}`,
    testnetPair: Chain.EVM_SEPOLIA
  },
  polygon: {
    chain: "polygon",
    name: "Polygon Mainnet",
    rpcUrl: "https://polygon-rpc.com",
    explorerTxUrl: h => `https://polygonscan.com/tx/${h}`,
    testnetPair: Chain.EVM_POLYGON_AMOY
  },
  base: {
    chain: "base",
    name: "Base Mainnet",
    rpcUrl: "https://mainnet.base.org",
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
