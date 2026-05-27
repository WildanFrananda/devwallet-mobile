import { Chain } from "../../core/constants/chains.enum"
import { NetworkRegistry } from "../../core/constants/networks"
import type { ChainFeeEstimator } from "./chain-fee-estimator.interface"

// Conservative vsize for a single-input single-output P2WPKH tx.
const ESTIMATED_VSIZE = 141n

type FeeRecommendations = {
  fastestFee?: number
  halfHourFee?: number
  hourFee?: number
  economyFee?: number
  minimumFee?: number
}

class BitcoinFeeEstimator implements ChainFeeEstimator {
  public supports(chain: Chain): boolean {
    return chain === Chain.BITCOIN_TESTNET
  }

  public async estimateNativeFee(chain: Chain): Promise<bigint> {
    const base = NetworkRegistry.get(chain).rpcUrl
    try {
      const response = await fetch(`${base}/v1/fees/recommended`)
      if (!response.ok) return ESTIMATED_VSIZE * 10n
      const data = (await response.json()) as FeeRecommendations
      const satPerVByte = data.halfHourFee ?? data.hourFee ?? data.fastestFee ?? 10
      return BigInt(Math.ceil(satPerVByte)) * ESTIMATED_VSIZE
    } catch {
      return ESTIMATED_VSIZE * 10n
    }
  }
}

export default BitcoinFeeEstimator
