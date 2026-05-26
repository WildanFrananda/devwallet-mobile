import type { Chain } from "../../core/constants/chains.enum"
import type Balance from "../../models/balance.model"

interface ChainBalanceFetcher {
  supports(chain: Chain): boolean
  fetch(chain: Chain, address: string): Promise<Balance>
}

export type { ChainBalanceFetcher }
