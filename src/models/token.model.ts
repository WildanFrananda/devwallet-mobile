import { Chain } from "../core/constants/chains.enum"

class Token {
  public readonly chain: Chain
  public readonly contractAddress: string
  public readonly symbol: string
  public readonly decimals: number
  public readonly amount: bigint
  public readonly fetchedAt: Date

  public constructor(params: {
    chain: Chain
    contractAddress: string
    symbol: string
    decimals: number
    amount: bigint
    fetchedAt?: Date
  }) {
    this.chain = params.chain
    this.contractAddress = params.contractAddress
    this.symbol = params.symbol
    this.decimals = params.decimals
    this.amount = params.amount
    this.fetchedAt = params.fetchedAt ?? new Date()
  }

  public get formatted(): string {
    const sign = this.amount < 0n ? "-" : ""
    const abs = this.amount < 0n ? -this.amount : this.amount
    const base = 10n ** BigInt(this.decimals)
    const whole = abs / base
    const frac = abs % base
    const fracStr = frac.toString().padStart(this.decimals, "0").replace(/0+$/, "")
    const amount = fracStr.length > 0 ? `${whole}.${fracStr.slice(0, 6)}` : whole.toString()
    return `${sign}${amount} ${this.symbol}`
  }
}

export default Token
