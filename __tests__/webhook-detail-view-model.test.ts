import "reflect-metadata"
import { Subject } from "rxjs"
import WebhookDetailViewModel from "../src/viewmodels/WebhookDetailViewModel"
import Webhook from "../src/models/webhook.model"
import WebhookLog from "../src/models/webhook-log.model"
import type WebhookRepository from "../src/repositories/webhook.repository"
import type { WebhookEvent } from "../src/datasources/webhook/webhook.datasource"

function makeWebhook(): Webhook {
  return new Webhook({
    id: "wh-1",
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
  logsFn: jest.Mock
  deleteFn: jest.Mock
  } {
  const events = new Subject<WebhookEvent>()
  const logsFn = jest.fn(async () => [])
  const deleteFn = jest.fn(async () => undefined)
  const repo = {
    logs: logsFn,
    delete: deleteFn,
    events$: () => events.asObservable()
  } as unknown as WebhookRepository
  return { repo, events, logsFn, deleteFn }
}

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

describe("WebhookDetailViewModel", () => {
  it("bind() sets webhook + loads logs", async () => {
    const { repo, logsFn } = makeRepo()
    const vm = new WebhookDetailViewModel(repo)
    vm.bind(makeWebhook())
    await flush()
    expect(vm.webhook$.value?.id).toBe("wh-1")
    expect(logsFn).toHaveBeenCalledWith("wh-1", 50)
    expect(vm.logs$.value.status).toBe("success")
  })

  it("refreshLogs reloads for current webhook", async () => {
    const { repo, logsFn } = makeRepo()
    const vm = new WebhookDetailViewModel(repo)
    vm.bind(makeWebhook())
    await flush()
    logsFn.mockClear()
    logsFn.mockResolvedValueOnce([
      new WebhookLog({
        id: "lg-1",
        webhookId: "wh-1",
        blockNumber: "1",
        txHash: "0xt",
        logIndex: 0,
        decodedArgs: { x: 1 },
        firedAt: new Date()
      })
    ])
    vm.refreshLogs()
    await flush()
    expect(logsFn).toHaveBeenCalledWith("wh-1", 50)
  })

  it("live event for current webhook triggers refresh", async () => {
    const { repo, events, logsFn } = makeRepo()
    const vm = new WebhookDetailViewModel(repo)
    vm.bind(makeWebhook())
    await flush()
    logsFn.mockClear()
    events.next({
      type: "webhook.event",
      webhookId: "wh-1",
      blockNumber: "100",
      txHash: "0xff",
      decoded: {}
    })
    await flush()
    expect(logsFn).toHaveBeenCalled()
  })

  it("live event for OTHER webhook is ignored", async () => {
    const { repo, events, logsFn } = makeRepo()
    const vm = new WebhookDetailViewModel(repo)
    vm.bind(makeWebhook())
    await flush()
    logsFn.mockClear()
    events.next({
      type: "webhook.event",
      webhookId: "different-id",
      blockNumber: "100",
      txHash: "0xff",
      decoded: {}
    })
    await flush()
    expect(logsFn).not.toHaveBeenCalled()
  })

  it("delete() invokes repo.delete + calls onDone", async () => {
    const { repo, deleteFn } = makeRepo()
    const vm = new WebhookDetailViewModel(repo)
    vm.bind(makeWebhook())
    await flush()
    const onDone = jest.fn()
    vm.delete(onDone)
    await flush()
    expect(deleteFn).toHaveBeenCalledWith("wh-1")
    expect(onDone).toHaveBeenCalled()
  })

  it("delete() still calls onDone even when repo.delete errors", async () => {
    const { repo, deleteFn } = makeRepo()
    deleteFn.mockRejectedValue(new Error("network"))
    const vm = new WebhookDetailViewModel(repo)
    vm.bind(makeWebhook())
    await flush()
    const onDone = jest.fn()
    vm.delete(onDone)
    await flush()
    expect(onDone).toHaveBeenCalled()
  })
})
