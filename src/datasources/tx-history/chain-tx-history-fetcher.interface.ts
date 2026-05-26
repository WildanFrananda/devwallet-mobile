import type { Chain } from "../../core/constants/chains.enum"
import type Transaction from "../../models/transaction.model"

interface ChainTxHistoryFetcher {
  supports(chain: Chain): boolean
  fetch(chain: Chain, address: string, limit?: number): Promise<Transaction[]>
}

export type { ChainTxHistoryFetcher }
