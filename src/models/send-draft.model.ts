import { Chain } from "../core/constants/chains.enum"

/**
 * Optional gas override sourced from the Gas Oracle. When absent the
 * signer estimates fees itself via the standard viem path. When
 * present the signer must respect these exact wei values, so the user
 * gets the tier they selected on the Gas Oracle screen.
 */
type GasOverride = {
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
}

class SendDraft {
  public readonly chain: Chain
  public readonly fromAddress: string
  public readonly toAddress: string
  public readonly amount: bigint
  public readonly note: string | null
  public readonly gasOverride: GasOverride | null

  public constructor(params: {
    chain: Chain
    fromAddress: string
    toAddress: string
    amount: bigint
    note?: string | null
    gasOverride?: GasOverride | null
  }) {
    this.chain = params.chain
    this.fromAddress = params.fromAddress
    this.toAddress = params.toAddress
    this.amount = params.amount
    this.note = params.note ?? null
    this.gasOverride = params.gasOverride ?? null
  }
}

export default SendDraft
export type { GasOverride }
