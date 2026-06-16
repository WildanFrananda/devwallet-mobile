import { Injectable } from "react-native-mobile-mvvm/di"
import { Observable, Subject } from "rxjs"
import FaucetRepository from "./faucet.repository"
import FaucetRequest from "../models/faucet-request.model"
import type { FaucetEvent } from "../datasources/faucet/faucet-ws.client"
import { Chain } from "../core/constants/chains.enum"

const MOCK_AMOUNT = "0.05"
const EMIT_DELAY_MS = 300

/**
 * E2E-only Faucet repository. Registered in place of FaucetRepositoryImpl when
 * `Config.E2E_MOCK === "1"` (see DIContainer). Returns canned pending jobs from
 * `enqueue`, then pushes a `faucet.success` event per chain through `events$`
 * shortly after — exercising the FaucetViewModel's optimistic→success path
 * without a backend or WebSocket. Never hits the network.
 */
@Injectable()
class MockFaucetRepository extends FaucetRepository {
  private readonly subject = new Subject<FaucetEvent>()

  public override enqueue(addresses: Partial<Record<Chain, string>>): Promise<FaucetRequest[]> {
    const entries = Object.entries(addresses) as Array<[Chain, string]>
    const requests = entries.map(
      ([chain, address]) =>
        new FaucetRequest({
          id: `mock-${chain}`,
          chain,
          address,
          status: "pending",
          txHash: null,
          amount: null,
          errorMessage: null,
          manualUrl: null,
          completedAt: null
        })
    )

    // Emit success after the VM has stored the pending rows. Subject is already
    // subscribed (FaucetViewModel.initialize subscribes on mount).
    setTimeout(() => {
      for (const [chain, address] of entries) {
        this.subject.next({
          type: "faucet.success",
          requestId: `mock-${chain}`,
          chain,
          address,
          txHash: "0xmocktxhashdeadbeef",
          amount: MOCK_AMOUNT
        })
      }
    }, EMIT_DELAY_MS)

    return Promise.resolve(requests)
  }

  public override fetchStatus(requestId: string): Promise<FaucetRequest> {
    const chain = requestId.replace(/^mock-/, "") as Chain
    return Promise.resolve(
      new FaucetRequest({
        id: requestId,
        chain,
        address: "0xmock",
        status: "completed",
        txHash: "0xmocktxhashdeadbeef",
        amount: MOCK_AMOUNT,
        errorMessage: null,
        manualUrl: null,
        completedAt: new Date()
      })
    )
  }

  public override events$(): Observable<FaucetEvent> {
    return this.subject.asObservable()
  }
}

export default MockFaucetRepository
