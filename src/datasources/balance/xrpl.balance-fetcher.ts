import { Client } from "xrpl"
import { Chain } from "../../core/constants/chains.enum"
import { NetworkRegistry } from "../../core/constants/networks"
import Balance from "../../models/balance.model"
import type { ChainBalanceFetcher } from "./chain-balance-fetcher.interface"

class XrplBalanceFetcher implements ChainBalanceFetcher {
  public supports(chain: Chain): boolean {
    return chain === Chain.XRPL_TESTNET
  }

  public async fetch(chain: Chain, address: string): Promise<Balance> {
    const cfg = NetworkRegistry.get(chain)
    const client = new Client(cfg.rpcUrl)
    try {
      await client.connect()
      try {
        const xrp: unknown = await client.getXrpBalance(address)
        const xrpNumber = typeof xrp === "string" ? parseFloat(xrp) : (xrp as number)
        const drops = BigInt(Math.round(xrpNumber * 1_000_000))
        return new Balance({
          chain,
          address,
          raw: drops,
          decimals: cfg.decimals,
          symbol: cfg.symbol
        })
      } catch (err) {
        // XRPL accounts only exist on-ledger once they hold the reserve
        // (10 XRP). Pre-funding the address reports "Account not found"
        // — surface as 0 balance instead of a network error so the UI
        // shows the chain card normally.
        const message = err instanceof Error ? err.message : String(err)
        if (message.includes("Account not found")) {
          return new Balance({
            chain,
            address,
            raw: 0n,
            decimals: cfg.decimals,
            symbol: cfg.symbol
          })
        }
        throw err
      }
    } finally {
      await client.disconnect()
    }
  }
}

export default XrplBalanceFetcher
