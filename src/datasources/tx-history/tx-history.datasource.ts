import { Injectable } from "react-native-mobile-mvvm/di"
import { Chain } from "../../core/constants/chains.enum"
import Transaction from "../../models/transaction.model"
import type { ChainTxHistoryFetcher } from "./chain-tx-history-fetcher.interface"
import EvmTxHistoryFetcher from "./evm.tx-history-fetcher"

@Injectable()
class TxHistoryDatasource {
  private readonly fetchers: ReadonlyArray<ChainTxHistoryFetcher> = [new EvmTxHistoryFetcher()]

  public async fetch(chain: Chain, address: string, limit: number = 25): Promise<Transaction[]> {
    const fetcher = this.fetchers.find(f => f.supports(chain))
    if (!fetcher) return []
    return fetcher.fetch(chain, address, limit)
  }
}

export default TxHistoryDatasource
