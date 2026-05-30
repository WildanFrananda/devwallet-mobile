import { Injectable } from "react-native-mobile-mvvm/di"
import { createPublicClient, http } from "viem"
import { Chain } from "../../core/constants/chains.enum"
import { NetworkRegistry } from "../../core/constants/networks"
import { loggingTransport } from "../../core/network/logging-transport"

type GasTier = {
  label: "slow" | "standard" | "fast"
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
  baseFee: bigint
  /** Estimated wei cost of a 21,000-gas native transfer at this tier. */
  estimatedTransferWei: bigint
}

type GasOracleSnapshot = {
  chain: Chain
  fetchedAtIso: string
  recentBlockCount: number
  tiers: ReadonlyArray<GasTier>
  /** Last 10 block base fees, oldest → newest, for chart rendering. */
  baseFeeHistory: ReadonlyArray<bigint>
}

const EVM_CHAINS = new Set<Chain>([
  Chain.EVM_SEPOLIA,
  Chain.EVM_POLYGON_AMOY,
  Chain.EVM_BASE_SEPOLIA
])
const BLOCK_LOOKBACK = 10
const PERCENTILES: ReadonlyArray<number> = [25, 50, 95]
const TRANSFER_GAS = 21_000n

/**
 * 3-tier gas estimate driven by `eth_feeHistory`. Computes a base-fee
 * floor + per-tier priority fee from the last 10 blocks' percentile
 * tips. Used by the Gas Oracle screen and the Send screen's tier
 * selector.
 */
@Injectable()
class GasOracleDatasource {
  public async fetch(chain: Chain): Promise<GasOracleSnapshot> {
    if (!EVM_CHAINS.has(chain)) {
      throw new Error(`Gas Oracle currently supports EVM chains only (got ${chain})`)
    }
    const cfg = NetworkRegistry.get(chain)
    const client = createPublicClient({
      transport: loggingTransport(http(cfg.rpcUrl), chain, cfg.rpcUrl)
    })

    const history = await client.getFeeHistory({
      blockCount: BLOCK_LOOKBACK,
      rewardPercentiles: PERCENTILES as unknown as number[]
    })
    // The current block's base fee is the last entry of baseFeePerGas.
    const baseFeeHistory = history.baseFeePerGas
    const baseFee = baseFeeHistory[baseFeeHistory.length - 1] ?? 0n

    // Reward arrays: history.reward[i] = [p25, p50, p95] for block i.
    const reward = history.reward ?? []
    const tipColumns: bigint[][] = [[], [], []]
    for (const block of reward) {
      for (let p = 0; p < PERCENTILES.length; p++) {
        const tip = block[p]
        if (tip !== undefined) tipColumns[p]!.push(tip)
      }
    }
    const tipMedians = tipColumns.map(column => median(column))

    const tiers: GasTier[] = (["slow", "standard", "fast"] as const).map((label, i) => {
      const priority = tipMedians[i] ?? 0n
      const max = baseFee * 2n + priority
      return {
        label,
        baseFee,
        maxPriorityFeePerGas: priority,
        maxFeePerGas: max,
        estimatedTransferWei: max * TRANSFER_GAS
      }
    })

    return {
      chain,
      fetchedAtIso: new Date().toISOString(),
      recentBlockCount: baseFeeHistory.length,
      tiers,
      baseFeeHistory
    }
  }
}

function median(values: ReadonlyArray<bigint>): bigint {
  if (values.length === 0) return 0n
  const sorted = [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  const mid = sorted.length >> 1
  if (sorted.length % 2 === 1) return sorted[mid]!
  return (sorted[mid - 1]! + sorted[mid]!) / 2n
}

export default GasOracleDatasource
export type { GasTier, GasOracleSnapshot }
