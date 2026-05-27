import { Chain } from "../../core/constants/chains.enum"

interface ChainFeeEstimator {
  supports(chain: Chain): boolean
  /** Returns the worst-case fee in native chain units (wei / lamports / sats / drops). */
  estimateNativeFee(chain: Chain): Promise<bigint>
}

export type { ChainFeeEstimator }
