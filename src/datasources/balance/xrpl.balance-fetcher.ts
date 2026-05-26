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
      const xrp: unknown = await client.getXrpBalance(address)
      // getXrpBalance returns number in newer xrpl.js, string in older. Handle both.
      const xrpNumber = typeof xrp === "string" ? parseFloat(xrp) : (xrp as number)
      const drops = BigInt(Math.round(xrpNumber * 1_000_000))
      return new Balance({
        chain,
        address,
        raw: drops,
        decimals: cfg.decimals,
        symbol: cfg.symbol
      })
    } finally {
      await client.disconnect()
    }
  }
}

export default XrplBalanceFetcher
