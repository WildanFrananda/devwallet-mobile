import "reflect-metadata"
import { Observable } from "rxjs"
import WebhookCreateViewModel from "../src/viewmodels/WebhookCreateViewModel"
import Webhook from "../src/models/webhook.model"
import type WebhookRepository from "../src/repositories/webhook.repository"
import type { WebhookEvent } from "../src/datasources/webhook/webhook.datasource"

class FakeRepo implements WebhookRepository {
  public created: unknown[] = []
  public createResult: Webhook | null = null
  public createError: Error | null = null

  public create(input: {
    chain: Webhook["chain"]
    contractAddress: string
    eventSignature: string
    abi?: string
  }): Promise<Webhook> {
    this.created.push(input)
    if (this.createError) return Promise.reject(this.createError)
    if (!this.createResult) {
      return Promise.resolve(
        new Webhook({
          id: "id-1",
          chain: input.chain,
          contractAddress: input.contractAddress,
          eventSignature: input.eventSignature,
          isActive: true,
          expiresAt: new Date(),
          createdAt: new Date()
        })
      )
    }
    return Promise.resolve(this.createResult)
  }
  public list(): Promise<Webhook[]> {
    return Promise.resolve([])
  }
  public delete(): Promise<void> {
    return Promise.resolve()
  }
  public logs(): Promise<never[]> {
    return Promise.resolve([])
  }
  public events$(): Observable<WebhookEvent> {
    return new Observable<WebhookEvent>(() => {
      // no-op
    })
  }
}

describe("WebhookCreateViewModel", () => {
  it("parses event candidates from pasted ABI", () => {
    const vm = new WebhookCreateViewModel(new FakeRepo())
    const abi = JSON.stringify([
      {
        type: "event",
        name: "Transfer",
        inputs: [
          { name: "from", type: "address", indexed: true },
          { name: "to", type: "address", indexed: true },
          { name: "value", type: "uint256" }
        ]
      },
      {
        type: "function",
        name: "transfer",
        inputs: [],
        outputs: [],
        stateMutability: "nonpayable"
      },
      {
        type: "event",
        name: "Approval",
        inputs: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" }
        ]
      }
    ])
    vm.setAbi(abi)
    const candidates = vm.eventCandidates$.value
    expect(candidates).toHaveLength(2)
    expect(candidates[0]!.signature).toBe("Transfer(address,address,uint256)")
    expect(candidates[1]!.name).toBe("Approval")
  })

  it("emits empty candidate list for invalid JSON", () => {
    const vm = new WebhookCreateViewModel(new FakeRepo())
    vm.setAbi("not json")
    expect(vm.eventCandidates$.value).toHaveLength(0)
  })

  it("submit rejects malformed contract address", () => {
    const vm = new WebhookCreateViewModel(new FakeRepo())
    vm.setContractAddress("not-an-address")
    vm.setEventSignature("Transfer(address,address,uint256)")
    vm.submit()
    const state = vm.state$.value
    expect(state.status).toBe("error")
  })

  it("submit rejects malformed event signature", () => {
    const vm = new WebhookCreateViewModel(new FakeRepo())
    vm.setContractAddress("0x" + "a".repeat(40))
    vm.setEventSignature("not a signature")
    vm.submit()
    const state = vm.state$.value
    expect(state.status).toBe("error")
  })

  it("submit calls repo.create with normalized payload + reaches success", async () => {
    const repo = new FakeRepo()
    const vm = new WebhookCreateViewModel(repo)
    vm.setChain("evm:polygon-amoy")
    vm.setContractAddress("0x" + "a".repeat(40))
    vm.setEventSignature("Transfer(address,address,uint256)")
    vm.setAbi("[{\"type\":\"event\",\"name\":\"Transfer\",\"inputs\":[]}]")
    vm.submit()
    for (let i = 0; i < 30; i++) {
      if (vm.state$.value.status !== "loading") break
      await new Promise<void>(resolve => setTimeout(() => resolve(), 5))
    }
    expect(vm.state$.value.status).toBe("success")
    expect(repo.created).toHaveLength(1)
    const input = repo.created[0] as {
      chain: string
      contractAddress: string
      eventSignature: string
      abi: string | undefined
    }
    expect(input.chain).toBe("evm:polygon-amoy")
    expect(input.abi).toContain("Transfer")
  })

  it("submit propagates repo error to state", async () => {
    const repo = new FakeRepo()
    repo.createError = new Error("backend rejected")
    const vm = new WebhookCreateViewModel(repo)
    vm.setContractAddress("0x" + "a".repeat(40))
    vm.setEventSignature("Transfer(address,address,uint256)")
    vm.submit()
    for (let i = 0; i < 30; i++) {
      if (vm.state$.value.status !== "loading") break
      await new Promise<void>(resolve => setTimeout(() => resolve(), 5))
    }
    const state = vm.state$.value
    expect(state.status).toBe("error")
    if (state.status === "error") expect(state.message).toMatch(/backend rejected/)
  })
})
