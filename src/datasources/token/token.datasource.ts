import { Injectable } from "react-native-mobile-mvvm/di"
import { Chain } from "../../core/constants/chains.enum"
import Token from "../../models/token.model"
import type { ChainTokenFetcher } from "./chain-token-fetcher.interface"
import EvmTokenFetcher from "./evm.token-fetcher"
import SolanaTokenFetcher from "./solana.token-fetcher"

/**
 * Strategy dispatcher for ERC-20 + SPL token balance fetching. Phase 1
 * covers EVM only — Day 14 plugs SPL via a SolanaTokenFetcher class
 * implementing the same interface (no orchestrator change needed).
 */
@Injectable()
class TokenDatasource {
  private readonly fetchers: ReadonlyArray<ChainTokenFetcher> = [new EvmTokenFetcher(), new SolanaTokenFetcher()]

  public async fetch(chain: Chain, address: string): Promise<Token[]> {
    const fetcher = this.fetchers.find(f => f.supports(chain))
    if (!fetcher) return []
    return fetcher.fetch(chain, address)
  }
}

export default TokenDatasource
