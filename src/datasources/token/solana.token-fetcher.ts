import { Connection, PublicKey } from "@solana/web3.js"
import { Chain } from "../../core/constants/chains.enum"
import { NetworkRegistry } from "../../core/constants/networks"
import { callAndLog } from "../../core/network/logging-transport"
import Token from "../../models/token.model"
import type { ChainTokenFetcher } from "./chain-token-fetcher.interface"

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")

type ParsedTokenAccountInfo = {
  mint: string
  tokenAmount: {
    amount: string
    decimals: number
    uiAmountString: string
  }
}

type ParsedAccount = {
  account: {
    data: { parsed: { info: ParsedTokenAccountInfo } }
  }
}

class SolanaTokenFetcher implements ChainTokenFetcher {
  public supports(chain: Chain): boolean {
    return chain === Chain.SOLANA_DEVNET
  }

  public async fetch(chain: Chain, address: string): Promise<Token[]> {
    const cfg = NetworkRegistry.get(chain)
    const connection = new Connection(cfg.rpcUrl, "confirmed")
    const owner = new PublicKey(address)

    const result = await callAndLog({
      chain,
      endpoint: cfg.rpcUrl,
      method: "getParsedTokenAccountsByOwner",
      params: { owner: address, programId: TOKEN_PROGRAM_ID.toBase58() },
      run: () => connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID })
    })
    const list = result.value as unknown as ParsedAccount[]

    const tokens: Token[] = []
    for (const item of list) {
      const info = item.account.data.parsed.info
      const raw = BigInt(info.tokenAmount.amount)
      if (raw === 0n) continue
      tokens.push(
        new Token({
          chain,
          contractAddress: info.mint,
          symbol: info.mint.slice(0, 4).toUpperCase(),
          decimals: info.tokenAmount.decimals,
          amount: raw
        })
      )
    }
    return tokens
  }
}

export default SolanaTokenFetcher
