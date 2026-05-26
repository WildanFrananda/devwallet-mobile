import type { Chain } from "../../core/constants/chains.enum"
import type Token from "../../models/token.model"

interface ChainTokenFetcher {
  supports(chain: Chain): boolean
  fetch(chain: Chain, address: string): Promise<Token[]>
}

export type { ChainTokenFetcher }
