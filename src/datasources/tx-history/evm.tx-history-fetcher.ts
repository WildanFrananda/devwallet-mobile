import { Chain } from "../../core/constants/chains.enum"
import { TxHistoryEndpoints } from "../../core/constants/tx-history-endpoints"
import Transaction from "../../models/transaction.model"
import type { ChainTxHistoryFetcher } from "./chain-tx-history-fetcher.interface"

type EtherscanTxRow = {
  hash: string
  from: string
  to: string
  value: string
  blockNumber: string
  timeStamp: string
  isError: "0" | "1"
  txreceipt_status?: "0" | "1"
  gasUsed: string
  gasPrice: string
}

type EtherscanResponse = {
  status: string
  message: string
  result: EtherscanTxRow[] | string
}

class EvmTxHistoryFetcher implements ChainTxHistoryFetcher {
  private static readonly EVM_CHAINS: ReadonlyArray<Chain> = [
    Chain.EVM_SEPOLIA,
    Chain.EVM_POLYGON_AMOY,
    Chain.EVM_BASE_SEPOLIA
  ]

  public supports(chain: Chain): boolean {
    return EvmTxHistoryFetcher.EVM_CHAINS.includes(chain)
  }

  public async fetch(chain: Chain, address: string, limit: number = 25): Promise<Transaction[]> {
    const base = TxHistoryEndpoints.for(chain)
    if (!base) return []

    const url = `${base}?module=account&action=txlist&address=${address}&sort=desc&page=1&offset=${limit}`
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`${base} ${res.status}`)
    }
    const body = (await res.json()) as EtherscanResponse
    if (body.status !== "1" || !Array.isArray(body.result)) {
      return []
    }

    return body.result.map(row => {
      const success = (row.txreceipt_status ?? row.isError) === "1" || row.isError === "0"
      const gasUsed = BigInt(row.gasUsed || "0")
      const gasPrice = BigInt(row.gasPrice || "0")
      return new Transaction({
        chain,
        hash: row.hash,
        from: row.from,
        to: row.to,
        value: BigInt(row.value || "0"),
        status: success ? "success" : "failed",
        blockNumber: parseInt(row.blockNumber, 10) || null,
        timestamp: row.timeStamp ? new Date(parseInt(row.timeStamp, 10) * 1000) : null,
        gasUsed,
        fee: gasUsed * gasPrice
      })
    })
  }
}

export default EvmTxHistoryFetcher
