import { Observable } from "rxjs"
import { Chain } from "../core/constants/chains.enum"
import Contract from "../models/contract.model"

abstract class ContractRepository {
  public abstract save(input: { chain: Chain; address: string; name: string; rawAbi: string }): Contract
  public abstract list(): Contract[]
  public abstract get(id: string): Contract | null
  public abstract delete(id: string): void
  public abstract stream$(): Observable<Contract[]>
}

export default ContractRepository
