import "reflect-metadata"
import { Subject } from "rxjs"
import WebhookListViewModel from "../src/viewmodels/WebhookListViewModel"
import Webhook from "../src/models/webhook.model"
import type WebhookRepository from "../src/repositories/webhook.repository"
import type { WebhookEvent } from "../src/datasources/webhook/webhook.datasource"

function makeWebhook(id: string): Webhook {
  return new Webhook({
    id,
    chain: "evm:sepolia",
    contractAddress: "0xabc",
    eventSignature: "Transfer(address,address,uint256)",
    isActive: true,
    expiresAt: new Date(),
    createdAt: new Date()
  })
}

function makeRepo(): {
  repo: WebhookRepository
  events: Subject<WebhookEvent>
  listFn: jest.Mock
  deleteFn: jest.Mock
  } {
  const events = new Subject<WebhookEvent>()
  const listFn = jest.fn(async () => [makeWebhook("wh-1"), makeWebhook("wh-2")])
  const deleteFn = jest.fn(async () => undefined)
  const repo = {
    list: listFn,
    delete: deleteFn,
    events$: () => events.asObservable()
  } as unknown as WebhookRepository
  return { repo, events, listFn, deleteFn }
}

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

describe("WebhookListViewModel", () => {
  it("refresh loads list + sets success", async () => {
    const { repo } = makeRepo()
    const vm = new WebhookListViewModel(repo)
    vm.refresh()
    expect(vm.state$.value.status).toBe("loading")
    await flush()
    const state = vm.state$.value
    expect(state.status).toBe("success")
    if (state.status === "success") expect(state.data).toHaveLength(2)
  })

  it("refresh error surfaces", async () => {
    const repo = {
      list: jest.fn(async () => {
        throw new Error("net")
      }),
      delete: jest.fn(),
      events$: () => new Subject().asObservable()
    } as unknown as WebhookRepository
    const vm = new WebhookListViewModel(repo)
    vm.refresh()
    await flush()
    expect(vm.state$.value.status).toBe("error")
  })

  it("delete() removes + triggers refresh", async () => {
    const { repo, deleteFn, listFn } = makeRepo()
    const vm = new WebhookListViewModel(repo)
    listFn.mockClear()
    vm.delete("wh-1")
    await flush()
    expect(deleteFn).toHaveBeenCalledWith("wh-1")
    expect(listFn).toHaveBeenCalled()
  })

  it("incoming WebSocket event updates lastEventAt$", async () => {
    const { repo, events } = makeRepo()
    const vm = new WebhookListViewModel(repo)
    const before = vm.lastEventAt$.value
    events.next({
      type: "webhook.event",
      webhookId: "wh-1",
      blockNumber: "1",
      txHash: "0x",
      decoded: {}
    })
    await flush()
    expect(vm.lastEventAt$.value).toBeGreaterThan(before)
  })
})
