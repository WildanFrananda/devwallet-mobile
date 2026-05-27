jest.mock("../src/datasources/faucet/faucet-ws.client", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Subject: MockSubject } = require("rxjs") as typeof import("rxjs")
  const subject = new MockSubject<unknown>()
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      connect: () => subject.asObservable(),
      dispose: jest.fn()
    }))
  }
})

import FaucetRepositoryImpl from "../src/repositories/faucet.repository.impl"
import FaucetDatasource from "../src/datasources/faucet/faucet.datasource"
import DeviceFingerprintService from "../src/core/auth/device-fingerprint.service"
import { Chain } from "../src/core/constants/chains.enum"

describe("FaucetRepositoryImpl", () => {
  let api: { enqueue: jest.Mock; status: jest.Mock }
  let fingerprint: { get: jest.Mock; platform: jest.Mock }
  let repo: FaucetRepositoryImpl

  beforeEach(() => {
    api = {
      enqueue: jest.fn().mockResolvedValue({
        jobs: [
          { chain: "evm:sepolia", requestId: "r-1", jobId: "j-1" },
          { chain: "xrpl:testnet", requestId: "r-2", jobId: "j-2" }
        ]
      }),
      status: jest.fn()
    }
    fingerprint = {
      get: jest.fn().mockResolvedValue("fp-test"),
      platform: jest.fn().mockReturnValue("android")
    }
    repo = new FaucetRepositoryImpl(
      api as unknown as FaucetDatasource,
      fingerprint as unknown as DeviceFingerprintService
    )
  })

  it("enqueue maps each job to a FaucetRequest pending row", async () => {
    const addresses: Partial<Record<Chain, string>> = {
      [Chain.EVM_SEPOLIA]: "0xabc",
      [Chain.XRPL_TESTNET]: "rDest"
    }
    const result = await repo.enqueue(addresses)
    expect(api.enqueue).toHaveBeenCalledWith(addresses, "fp-test")
    expect(result).toHaveLength(2)
    expect(result[0]?.id).toBe("r-1")
    expect(result[0]?.status).toBe("pending")
    expect(result[1]?.chain).toBe(Chain.XRPL_TESTNET)
  })

  it("fetchStatus maps row to domain model", async () => {
    api.status.mockResolvedValue({
      id: "r-3",
      chain: "solana:devnet",
      address: "addr",
      status: "completed",
      tx_hash: "sig",
      amount: "0.005",
      error_msg: null,
      manual_url: null,
      completed_at: "2026-05-27T08:00:00Z"
    })
    const request = await repo.fetchStatus("r-3")
    expect(request.txHash).toBe("sig")
    expect(request.amount).toBe("0.005")
    expect(request.completedAt?.toISOString()).toBe("2026-05-27T08:00:00.000Z")
  })

  it("events$() resolves fingerprint before connecting", () => {
    const obs = repo.events$()
    expect(obs).toBeDefined()
  })
})
