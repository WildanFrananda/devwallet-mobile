import { createPublicClient, http, erc20Abi, type Address } from "viem"
import { Chain } from "../../core/constants/chains.enum"
import { NetworkRegistry } from "../../core/constants/networks"
import { TokenRegistry } from "../../core/constants/token-registry"
import Token from "../../models/token.model"
import type { ChainTokenFetcher } from "./chain-token-fetcher.interface"

class EvmTokenFetcher implements ChainTokenFetcher {
  private static readonly EVM_CHAINS: ReadonlyArray<Chain> = [
    Chain.EVM_SEPOLIA,
    Chain.EVM_HOLESKY,
    Chain.EVM_POLYGON_AMOY,
    Chain.EVM_BASE_SEPOLIA,
    Chain.EVM_LOCAL
  ]

  public supports(chain: Chain): boolean {
    return EvmTokenFetcher.EVM_CHAINS.includes(chain)
  }

  public async fetch(chain: Chain, address: string): Promise<Token[]> {
    const specs = TokenRegistry.for(chain)
    if (specs.length === 0) return []

    const cfg = NetworkRegistry.get(chain)
    const client = createPublicClient({ transport: http(cfg.rpcUrl) })

    const settled = await Promise.allSettled(
      specs.map(async spec => {
        const raw = await client.readContract({
          address: spec.contractAddress,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address as Address]
        })
        return new Token({
          chain,
          contractAddress: spec.contractAddress,
          symbol: spec.symbol,
          decimals: spec.decimals,
          amount: raw
        })
      })
    )

    return settled.flatMap(res => (res.status === "fulfilled" ? [res.value] : []))
  }
}

export default EvmTokenFetcher
