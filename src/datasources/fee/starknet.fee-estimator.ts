import { Chain } from "../../core/constants/chains.enum"
import type { ChainFeeEstimator } from "./chain-fee-estimator.interface"

// Starknet send disabled in Phase 2. Fee estimator stub returns 0 so the
// Max button doesn't crash if the UI ever reaches it.
class StarknetFeeEstimator implements ChainFeeEstimator {
  public supports(chain: Chain): boolean {
    return chain === Chain.STARKNET_SEPOLIA
  }

  public estimateNativeFee(): Promise<bigint> {
    return Promise.resolve(0n)
  }
}

export default StarknetFeeEstimator
