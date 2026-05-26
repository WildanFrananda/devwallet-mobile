import { Chain } from "../../core/constants/chains.enum"
import { NetworkRegistry } from "../../core/constants/networks"
import Balance from "../../models/balance.model"
import type { ChainBalanceFetcher } from "./chain-balance-fetcher.interface"

type BlockstreamAddressStats = {
  chain_stats: { funded_txo_sum: number; spent_txo_sum: number }
  mempool_stats: { funded_txo_sum: number; spent_txo_sum: number }
}

class BitcoinBalanceFetcher implements ChainBalanceFetcher {
  public supports(chain: Chain): boolean {
    return chain === Chain.BITCOIN_TESTNET
  }

  public async fetch(chain: Chain, address: string): Promise<Balance> {
    const cfg = NetworkRegistry.get(chain)
    const url = `${cfg.rpcUrl}/address/${address}`
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`Blockstream ${res.status}: ${await res.text()}`)
    }
    const stats = (await res.json()) as BlockstreamAddressStats
    const confirmed = stats.chain_stats.funded_txo_sum - stats.chain_stats.spent_txo_sum
    const mempool = stats.mempool_stats.funded_txo_sum - stats.mempool_stats.spent_txo_sum
    const sats = BigInt(confirmed + mempool)
    return new Balance({
      chain,
      address,
      raw: sats,
      decimals: cfg.decimals,
      symbol: cfg.symbol
    })
  }
}

export default BitcoinBalanceFetcher
