import { Connection } from "@solana/web3.js"
import { Chain } from "../../core/constants/chains.enum"
import { NetworkRegistry } from "../../core/constants/networks"
import { callAndLog } from "../../core/network/logging-transport"
import type { ChainFeeEstimator } from "./chain-fee-estimator.interface"

const BASE_FEE_LAMPORTS = 5_000n

class SolanaFeeEstimator implements ChainFeeEstimator {
  public supports(chain: Chain): boolean {
    return chain === Chain.SOLANA_DEVNET
  }

  public async estimateNativeFee(chain: Chain): Promise<bigint> {
    const rpc = NetworkRegistry.get(chain).rpcUrl
    try {
      const connection = new Connection(rpc, "confirmed")
      const recent = await callAndLog({
        chain,
        endpoint: rpc,
        method: "getRecentPrioritizationFees",
        params: {},
        run: () => connection.getRecentPrioritizationFees()
      })
      const maxPrio = recent.reduce((acc, e) => Math.max(acc, e.prioritizationFee), 0)
      // Cap at 5000 lamports so a noisy validator doesn't crater the Max.
      const prio = BigInt(Math.min(maxPrio, 5_000))
      return BASE_FEE_LAMPORTS + prio
    } catch {
      return BASE_FEE_LAMPORTS
    }
  }
}

export default SolanaFeeEstimator
