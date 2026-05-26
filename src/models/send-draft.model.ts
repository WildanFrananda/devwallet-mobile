import { Chain } from "../core/constants/chains.enum"

class SendDraft {
  public readonly chain: Chain
  public readonly fromAddress: string
  public readonly toAddress: string
  public readonly amount: bigint
  public readonly note: string | null

  public constructor(params: {
    chain: Chain
    fromAddress: string
    toAddress: string
    amount: bigint
    note?: string | null
  }) {
    this.chain = params.chain
    this.fromAddress = params.fromAddress
    this.toAddress = params.toAddress
    this.amount = params.amount
    this.note = params.note ?? null
  }
}

export default SendDraft
