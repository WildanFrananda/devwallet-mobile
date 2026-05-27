import { StargateClient } from "@cosmjs/stargate"
import { Chain } from "../../core/constants/chains.enum"
import { NetworkRegistry } from "../../core/constants/networks"
import Balance from "../../models/balance.model"
import type { ChainBalanceFetcher } from "./chain-balance-fetcher.interface"

class CosmosBalanceFetcher implements ChainBalanceFetcher {
  public supports(chain: Chain): boolean {
    return chain === Chain.COSMOS_THETA
  }

  public async fetch(chain: Chain, address: string): Promise<Balance> {
    const cfg = NetworkRegistry.get(chain)
    const client = await StargateClient.connect(cfg.rpcUrl)
    try {
      const coin = await client.getBalance(address, "uatom")
      return new Balance({
        chain,
        address,
        raw: BigInt(coin.amount),
        decimals: cfg.decimals,
        symbol: cfg.symbol
      })
    } finally {
      client.disconnect()
    }
  }
}

export default CosmosBalanceFetcher
