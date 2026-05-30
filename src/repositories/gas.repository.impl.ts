import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import { Chain } from "../core/constants/chains.enum"
import { Tokens } from "../core/di/tokens"
import type GasOracleDatasource from "../datasources/gas/gas-oracle.datasource"
import type { GasOracleSnapshot } from "../datasources/gas/gas-oracle.datasource"
import GasRepository from "./gas.repository"

@Injectable()
class GasRepositoryImpl extends GasRepository {
  public constructor(
    @Inject(Tokens.GasOracleDatasource) private readonly datasource: GasOracleDatasource
  ) {
    super()
  }

  public fetchOracle(chain: Chain): Promise<GasOracleSnapshot> {
    return this.datasource.fetch(chain)
  }
}

export default GasRepositoryImpl
