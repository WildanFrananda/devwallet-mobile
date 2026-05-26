import { Chain } from "../core/constants/chains.enum"

type TransactionStatus = "success" | "failed" | "pending"

class Transaction {
  public readonly chain: Chain
  public readonly hash: string
  public readonly from: string
  public readonly to: string
  public readonly value: bigint
  public readonly status: TransactionStatus
  public readonly blockNumber: number | null
  public readonly timestamp: Date | null
  public readonly gasUsed: bigint | null
  public readonly fee: bigint | null

  public constructor(params: {
    chain: Chain
    hash: string
    from: string
    to: string
    value: bigint
    status: TransactionStatus
    blockNumber?: number | null
    timestamp?: Date | null
    gasUsed?: bigint | null
    fee?: bigint | null
  }) {
    this.chain = params.chain
    this.hash = params.hash
    this.from = params.from
    this.to = params.to
    this.value = params.value
    this.status = params.status
    this.blockNumber = params.blockNumber ?? null
    this.timestamp = params.timestamp ?? null
    this.gasUsed = params.gasUsed ?? null
    this.fee = params.fee ?? null
  }

  public isOutgoingFor(address: string): boolean {
    return this.from.toLowerCase() === address.toLowerCase()
  }

  public counterpartyFor(address: string): string {
    return this.isOutgoingFor(address) ? this.to : this.from
  }
}

export default Transaction
export type { TransactionStatus }
