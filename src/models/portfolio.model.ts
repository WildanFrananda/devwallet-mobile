import Account from "./account.model"
import Balance from "./balance.model"

type PortfolioEntry = {
  account: Account
  balance: Balance | null
  error: string | null
}

class Portfolio {
  public readonly entries: ReadonlyArray<PortfolioEntry>
  public readonly fetchedAt: Date

  public constructor(entries: ReadonlyArray<PortfolioEntry>, fetchedAt: Date = new Date()) {
    this.entries = entries
    this.fetchedAt = fetchedAt
  }

  public get succeeded(): PortfolioEntry[] {
    return this.entries.filter(e => e.balance !== null)
  }

  public get failed(): PortfolioEntry[] {
    return this.entries.filter(e => e.error !== null)
  }
}

export default Portfolio
export type { PortfolioEntry }
