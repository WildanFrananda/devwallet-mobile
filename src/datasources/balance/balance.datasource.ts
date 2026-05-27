import { Injectable } from "react-native-mobile-mvvm/di"
import { Chain } from "../../core/constants/chains.enum"
import Account from "../../models/account.model"
import Balance from "../../models/balance.model"
import type { ChainBalanceFetcher } from "./chain-balance-fetcher.interface"
import EvmBalanceFetcher from "./evm.balance-fetcher"
import SolanaBalanceFetcher from "./solana.balance-fetcher"
import BitcoinBalanceFetcher from "./bitcoin.balance-fetcher"
import XrplBalanceFetcher from "./xrpl.balance-fetcher"
import CosmosBalanceFetcher from "./cosmos.balance-fetcher"

type FetchResult = {
  account: Account
  balance: Balance | null
  error: string | null
}

/**
 * Strategy-pattern dispatcher: holds a list of per-chain balance fetchers
 * and runs them in parallel against the given account set. Chains without
 * a registered fetcher (StarkNet — account contract deploy is Phase 2)
 * get a graceful per-entry error instead of throwing.
 */
@Injectable()
class BalanceDatasource {
  private readonly fetchers: ReadonlyArray<ChainBalanceFetcher> = [
    new EvmBalanceFetcher(),
    new SolanaBalanceFetcher(),
    new BitcoinBalanceFetcher(),
    new XrplBalanceFetcher(),
    new CosmosBalanceFetcher()
  ]

  public async fetchOne(chain: Chain, address: string): Promise<Balance> {
    const fetcher = this.fetchers.find(f => f.supports(chain))
    if (!fetcher) {
      throw new Error(`No balance fetcher registered for ${chain}`)
    }
    return fetcher.fetch(chain, address)
  }

  public async fetchMany(accounts: ReadonlyArray<Account>): Promise<FetchResult[]> {
    const settled = await Promise.allSettled(
      accounts.map(async account => ({
        account,
        balance: await this.fetchOne(account.chain, account.address)
      }))
    )

    return settled.map((res, i) => {
      const account = accounts[i]!
      if (res.status === "fulfilled") {
        return { account, balance: res.value.balance, error: null }
      }
      return {
        account,
        balance: null,
        error: res.reason instanceof Error ? res.reason.message : String(res.reason)
      }
    })
  }
}

export default BalanceDatasource
export type { FetchResult }
