import { Observable } from "rxjs"
import { Chain } from "../core/constants/chains.enum"
import FaucetRequest from "../models/faucet-request.model"
import type { FaucetEvent } from "../datasources/faucet/faucet-ws.client"

abstract class FaucetRepository {
  /** Submit a batch faucet request — one job per chain in `addresses`. */
  public abstract enqueue(addresses: Partial<Record<Chain, string>>): Promise<FaucetRequest[]>

  /** One-shot fetch of a request's current state. */
  public abstract fetchStatus(requestId: string): Promise<FaucetRequest>

  /** Live stream of all events for this device. Auto-connects on first subscription. */
  public abstract events$(): Observable<FaucetEvent>
}

export default FaucetRepository
