type WebhookChain = "evm:sepolia" | "evm:polygon-amoy" | "evm:base-sepolia"

class Webhook {
  public readonly id: string
  public readonly chain: WebhookChain
  public readonly contractAddress: string
  public readonly eventSignature: string
  public readonly isActive: boolean
  public readonly expiresAt: Date
  public readonly createdAt: Date

  public constructor(params: {
    id: string
    chain: WebhookChain
    contractAddress: string
    eventSignature: string
    isActive: boolean
    expiresAt: Date
    createdAt: Date
  }) {
    this.id = params.id
    this.chain = params.chain
    this.contractAddress = params.contractAddress
    this.eventSignature = params.eventSignature
    this.isActive = params.isActive
    this.expiresAt = params.expiresAt
    this.createdAt = params.createdAt
  }

  public eventName(): string {
    return this.eventSignature.split("(")[0] ?? this.eventSignature
  }
}

export default Webhook
export type { WebhookChain }
