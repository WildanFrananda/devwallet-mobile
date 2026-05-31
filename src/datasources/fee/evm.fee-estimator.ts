import { createPublicClient, http } from "viem"
import { Chain } from "../../core/constants/chains.enum"
import { NetworkRegistry } from "../../core/constants/networks"
import { loggingTransport } from "../../core/network/logging-transport"
import type { ChainFeeEstimator } from "./chain-fee-estimator.interface"

const TRANSFER_GAS = 21_000n
const SAFETY_MULTIPLIER = 12n // 1.2× headroom for sudden congestion
const SAFETY_DIVISOR = 10n

class EvmFeeEstimator implements ChainFeeEstimator {
  private static readonly EVM_CHAINS: ReadonlyArray<Chain> = [
    Chain.EVM_SEPOLIA,
    Chain.EVM_POLYGON_AMOY,
    Chain.EVM_BASE_SEPOLIA
  ]

  public supports(chain: Chain): boolean {
    return EvmFeeEstimator.EVM_CHAINS.includes(chain)
  }

  public async estimateNativeFee(chain: Chain): Promise<bigint> {
    const cfg = NetworkRegistry.get(chain)
    const client = createPublicClient({
      transport: loggingTransport(http(cfg.rpcUrl), chain, cfg.rpcUrl)
    })
    try {
      const fees = await client.estimateFeesPerGas()
      const maxFee = fees.maxFeePerGas ?? fees.gasPrice ?? 2_000_000_000n
      return (TRANSFER_GAS * maxFee * SAFETY_MULTIPLIER) / SAFETY_DIVISOR
    } catch {
      return TRANSFER_GAS * 2_000_000_000n
    }
  }
}

export default EvmFeeEstimator
