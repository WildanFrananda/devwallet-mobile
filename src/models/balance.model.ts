import { Chain } from "../core/constants/chains.enum"

class Balance {
  public readonly chain: Chain
  public readonly address: string
  public readonly raw: bigint
  public readonly decimals: number
  public readonly symbol: string
  public readonly fetchedAt: Date

  public constructor(params: {
    chain: Chain
    address: string
    raw: bigint
    decimals: number
    symbol: string
    fetchedAt?: Date
  }) {
    this.chain = params.chain
    this.address = params.address
    this.raw = params.raw
    this.decimals = params.decimals
    this.symbol = params.symbol
    this.fetchedAt = params.fetchedAt ?? new Date()
  }

  /**
   * Human-readable amount, e.g. `0.0123 ETH`. No scientific notation, no
   * trailing zeros past 8 decimals — UI can re-format if needed.
   */
  public get formatted(): string {
    const sign = this.raw < 0n ? "-" : ""
    const abs = this.raw < 0n ? -this.raw : this.raw
    const base = 10n ** BigInt(this.decimals)
    const whole = abs / base
    const frac = abs % base
    const fracStr = frac.toString().padStart(this.decimals, "0").replace(/0+$/, "")
    const amount = fracStr.length > 0 ? `${whole}.${fracStr.slice(0, 8)}` : whole.toString()
    return `${sign}${amount} ${this.symbol}`
  }
}

export default Balance
