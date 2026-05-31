class WebhookLog {
  public readonly id: string
  public readonly webhookId: string | null
  public readonly blockNumber: string | null
  public readonly txHash: string | null
  public readonly logIndex: number | null
  public readonly decodedArgs: Record<string, unknown> | null
  public readonly firedAt: Date

  public constructor(params: {
    id: string
    webhookId: string | null
    blockNumber: string | null
    txHash: string | null
    logIndex: number | null
    decodedArgs: Record<string, unknown> | null
    firedAt: Date
  }) {
    this.id = params.id
    this.webhookId = params.webhookId
    this.blockNumber = params.blockNumber
    this.txHash = params.txHash
    this.logIndex = params.logIndex
    this.decodedArgs = params.decodedArgs
    this.firedAt = params.firedAt
  }
}

export default WebhookLog
