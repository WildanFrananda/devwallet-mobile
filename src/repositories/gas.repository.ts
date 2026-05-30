import { Chain } from "../core/constants/chains.enum"
import type { GasOracleSnapshot } from "../datasources/gas/gas-oracle.datasource"

abstract class GasRepository {
  public abstract fetchOracle(chain: Chain): Promise<GasOracleSnapshot>
}

export default GasRepository
