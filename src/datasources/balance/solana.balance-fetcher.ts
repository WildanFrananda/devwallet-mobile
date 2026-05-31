import { Connection, PublicKey } from "@solana/web3.js"
import { Chain } from "../../core/constants/chains.enum"
import { NetworkRegistry } from "../../core/constants/networks"
import { callAndLog } from "../../core/network/logging-transport"
import Balance from "../../models/balance.model"
import type { ChainBalanceFetcher } from "./chain-balance-fetcher.interface"

class SolanaBalanceFetcher implements ChainBalanceFetcher {
  public supports(chain: Chain): boolean {
    return chain === Chain.SOLANA_DEVNET
  }

  public async fetch(chain: Chain, address: string): Promise<Balance> {
    const cfg = NetworkRegistry.get(chain)
    const connection = new Connection(cfg.rpcUrl, "confirmed")
    const lamports = await callAndLog({
      chain,
      endpoint: cfg.rpcUrl,
      method: "getBalance",
      params: { address },
      run: () => connection.getBalance(new PublicKey(address))
    })
    return new Balance({
      chain,
      address,
      raw: BigInt(lamports),
      decimals: cfg.decimals,
      symbol: cfg.symbol
    })
  }
}

export default SolanaBalanceFetcher
