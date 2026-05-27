import { createPublicClient, http, type Address } from "viem"
import { Chain } from "../../core/constants/chains.enum"
import { NetworkRegistry } from "../../core/constants/networks"
import Balance from "../../models/balance.model"
import type { ChainBalanceFetcher } from "./chain-balance-fetcher.interface"

class EvmBalanceFetcher implements ChainBalanceFetcher {
  private static readonly EVM_CHAINS: ReadonlyArray<Chain> = [
    Chain.EVM_SEPOLIA,
    Chain.EVM_POLYGON_AMOY,
    Chain.EVM_BASE_SEPOLIA
  ]

  public supports(chain: Chain): boolean {
    return EvmBalanceFetcher.EVM_CHAINS.includes(chain)
  }

  public async fetch(chain: Chain, address: string): Promise<Balance> {
    const cfg = NetworkRegistry.get(chain)
    const client = createPublicClient({ transport: http(cfg.rpcUrl) })
    const raw = await client.getBalance({ address: address as Address })
    return new Balance({
      chain,
      address,
      raw,
      decimals: cfg.decimals,
      symbol: cfg.symbol
    })
  }
}

export default EvmBalanceFetcher
