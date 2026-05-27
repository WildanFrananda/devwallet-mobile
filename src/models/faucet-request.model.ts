import { Chain } from "../core/constants/chains.enum"

type FaucetStatus = "pending" | "processing" | "completed" | "failed"

class FaucetRequest {
  public readonly id: string
  public readonly chain: Chain
  public readonly address: string
  public readonly status: FaucetStatus
  public readonly txHash: string | null
  public readonly amount: string | null
  public readonly errorMessage: string | null
  public readonly manualUrl: string | null
  public readonly completedAt: Date | null

  public constructor(params: {
    id: string
    chain: Chain
    address: string
    status: FaucetStatus
    txHash: string | null
    amount: string | null
    errorMessage: string | null
    manualUrl: string | null
    completedAt: Date | null
  }) {
    this.id = params.id
    this.chain = params.chain
    this.address = params.address
    this.status = params.status
    this.txHash = params.txHash
    this.amount = params.amount
    this.errorMessage = params.errorMessage
    this.manualUrl = params.manualUrl
    this.completedAt = params.completedAt
  }

  public with(patch: Partial<{
    status: FaucetStatus
    txHash: string | null
    amount: string | null
    errorMessage: string | null
    manualUrl: string | null
    completedAt: Date | null
  }>): FaucetRequest {
    return new FaucetRequest({
      id: this.id,
      chain: this.chain,
      address: this.address,
      status: patch.status ?? this.status,
      txHash: patch.txHash ?? this.txHash,
      amount: patch.amount ?? this.amount,
      errorMessage: patch.errorMessage ?? this.errorMessage,
      manualUrl: patch.manualUrl ?? this.manualUrl,
      completedAt: patch.completedAt ?? this.completedAt
    })
  }
}

export default FaucetRequest
export type { FaucetStatus }
