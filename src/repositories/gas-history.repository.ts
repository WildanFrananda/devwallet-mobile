import { Observable } from "rxjs"
import { Chain } from "../core/constants/chains.enum"
import type { GasTier } from "../datasources/gas/gas-oracle.datasource"

type GasSample = {
  chain: Chain
  takenAtIso: string
  tiers: ReadonlyArray<GasTier>
  baseFee: bigint
}

abstract class GasHistoryRepository {
  public abstract recordIfDue(sample: GasSample, minSpacingMs: number): boolean
  public abstract list(chain: Chain): ReadonlyArray<GasSample>
  public abstract stream$(chain: Chain): Observable<ReadonlyArray<GasSample>>
  public abstract clear(chain: Chain): void
}

export default GasHistoryRepository
export type { GasSample }
