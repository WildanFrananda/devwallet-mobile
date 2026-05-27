import { Client } from "xrpl"
import { Chain } from "../../core/constants/chains.enum"
import { NetworkRegistry } from "../../core/constants/networks"
import type { ChainFeeEstimator } from "./chain-fee-estimator.interface"

const BASE_FEE_DROPS = 10n

class XrplFeeEstimator implements ChainFeeEstimator {
  public supports(chain: Chain): boolean {
    return chain === Chain.XRPL_TESTNET
  }

  public async estimateNativeFee(chain: Chain): Promise<bigint> {
    const cfg = NetworkRegistry.get(chain)
    const client = new Client(cfg.rpcUrl)
    try {
      await client.connect()
      const response = await client.request({ command: "fee" })
      const openLedgerFee = response.result.drops.open_ledger_fee
      const dropsString = typeof openLedgerFee === "string" ? openLedgerFee : String(openLedgerFee ?? "10")
      const parsed = BigInt(dropsString)
      return parsed > 0n ? parsed : BASE_FEE_DROPS
    } catch {
      return BASE_FEE_DROPS
    } finally {
      await client.disconnect()
    }
  }
}

export default XrplFeeEstimator
