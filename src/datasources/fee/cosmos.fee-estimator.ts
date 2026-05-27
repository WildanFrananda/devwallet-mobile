import { Chain } from "../../core/constants/chains.enum"
import type { ChainFeeEstimator } from "./chain-fee-estimator.interface"

// Cosmos `MsgSend` typically uses ~80k gas at 0.025 uatom/gas → 2000 uatom.
// Live simulation needs a signed tx, which is overkill for the Max button.
// Hardcoded conservative value works for Phase 2.
const FLAT_FEE_UATOM = 5_000n

class CosmosFeeEstimator implements ChainFeeEstimator {
  public supports(chain: Chain): boolean {
    return chain === Chain.COSMOS_THETA
  }

  public estimateNativeFee(): Promise<bigint> {
    return Promise.resolve(FLAT_FEE_UATOM)
  }
}

export default CosmosFeeEstimator
