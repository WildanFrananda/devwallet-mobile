import { Injectable } from "react-native-mobile-mvvm/di"
import { Chain } from "../../core/constants/chains.enum"
import type { ChainFeeEstimator } from "./chain-fee-estimator.interface"
import EvmFeeEstimator from "./evm.fee-estimator"
import BitcoinFeeEstimator from "./bitcoin.fee-estimator"
import SolanaFeeEstimator from "./solana.fee-estimator"
import CosmosFeeEstimator from "./cosmos.fee-estimator"
import XrplFeeEstimator from "./xrpl.fee-estimator"
import StarknetFeeEstimator from "./starknet.fee-estimator"

/**
 * Strategy registry for per-chain fee estimation. Mirrors the existing
 * BalanceDatasource pattern — add a chain by appending a new estimator.
 */
@Injectable()
class FeeDatasource {
  private readonly estimators: ReadonlyArray<ChainFeeEstimator> = [
    new EvmFeeEstimator(),
    new BitcoinFeeEstimator(),
    new SolanaFeeEstimator(),
    new CosmosFeeEstimator(),
    new XrplFeeEstimator(),
    new StarknetFeeEstimator()
  ]

  public async estimateNativeFee(chain: Chain): Promise<bigint> {
    const estimator = this.estimators.find(e => e.supports(chain))
    if (!estimator) throw new Error(`No fee estimator for chain ${chain}`)
    return estimator.estimateNativeFee(chain)
  }
}

export default FeeDatasource
