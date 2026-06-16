import "reflect-metadata"
import WebhookRepositoryImpl from "../src/repositories/webhook.repository.impl"
import WebhookDatasource from "../src/datasources/webhook/webhook.datasource"
import DeviceFingerprintService from "../src/core/auth/device-fingerprint.service"

const mmkvState: Record<string, unknown> = {}

jest.mock("react-native-mmkv", () => ({
  createMMKV: () => ({
    getBoolean: (key: string) => mmkvState[key] as boolean | undefined,
    getNumber: (key: string) => mmkvState[key] as number | undefined,
    getString: (key: string) => mmkvState[key] as string | undefined,
    set: (key: string, value: unknown) => {
      mmkvState[key] = value
    },
    remove: (key: string) => {
      delete mmkvState[key]
    }
  })
}))

// Mirror the real .env: API_BASE_URL already includes the /api/v1 prefix, so
// datasources append only the resource path (see faucet convention).
jest.mock("react-native-config", () => ({
  __esModule: true,
  default: { API_BASE_URL: "http://localhost:3000/api/v1" }
}))

const FP = "fp-deadbeef-1234"
const SAMPLE_ROW = {
  id: "wh-1",
  chain: "evm:sepolia",
  contractAddress: "0xabc",
  eventSignature: "Transfer(address,address,uint256)",
  isActive: true,
  expiresAt: "2030-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z"
}

function mockFetchOnce(body: unknown, status: number = 200): jest.Mock {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)),
    json: () => Promise.resolve(body)
  })
  ;(globalThis as unknown as { fetch: typeof fetchMock }).fetch = fetchMock
  return fetchMock
}

function makeBundle(): {
  repo: WebhookRepositoryImpl
  fingerprint: DeviceFingerprintService
} {
  const fingerprint = new DeviceFingerprintService()
  mmkvState["device.fingerprint"] = FP
  const datasource = new WebhookDatasource()
  const repo = new WebhookRepositoryImpl(datasource, fingerprint)
  return { repo, fingerprint }
}

describe("WebhookRepository (integration)", () => {
  beforeEach(() => {
    Object.keys(mmkvState).forEach(k => delete mmkvState[k])
  })

  it("create POSTs to /webhooks with fingerprint + returns Webhook model", async () => {
    const fetchMock = mockFetchOnce(SAMPLE_ROW, 201)
    const { repo } = makeBundle()
    const wh = await repo.create({
      chain: "evm:sepolia",
      contractAddress: "0xabc",
      eventSignature: "Transfer(address,address,uint256)"
    })
    expect(wh.id).toBe("wh-1")
    expect(wh.chain).toBe("evm:sepolia")
    expect(wh.expiresAt).toBeInstanceOf(Date)
    expect(wh.eventName()).toBe("Transfer")

    const [url, init] = fetchMock.mock.calls[0] as [string, { method: string; body: string }]
    expect(url).toBe("http://localhost:3000/api/v1/webhooks")
    expect(init.method).toBe("POST")
    const body = JSON.parse(init.body) as { deviceFingerprint: string }
    expect(body.deviceFingerprint).toBe(FP)
  })

  it("create surfaces backend error via thrown Error", async () => {
    mockFetchOnce("rate limit exceeded", 429)
    const { repo } = makeBundle()
    await expect(
      repo.create({
        chain: "evm:sepolia",
        contractAddress: "0xabc",
        eventSignature: "Transfer(address,address,uint256)"
      })
    ).rejects.toThrow(/429/)
  })

  it("list passes fingerprint as query param", async () => {
    const fetchMock = mockFetchOnce([SAMPLE_ROW, { ...SAMPLE_ROW, id: "wh-2" }])
    const { repo } = makeBundle()
    const list = await repo.list()
    expect(list).toHaveLength(2)
    expect(list[0]!.id).toBe("wh-1")
    const url = (fetchMock.mock.calls[0] as [string])[0]
    expect(url).toContain(`device=${FP}`)
  })

  it("delete issues DELETE /webhooks/:id", async () => {
    const fetchMock = mockFetchOnce("", 204)
    const { repo } = makeBundle()
    await repo.delete("wh-1")
    const [url, init] = fetchMock.mock.calls[0] as [string, { method: string }]
    expect(url).toBe("http://localhost:3000/api/v1/webhooks/wh-1")
    expect(init.method).toBe("DELETE")
  })

  it("logs hydrates WebhookLog models with parsed dates", async () => {
    const fetchMock = mockFetchOnce([
      {
        id: "lg-1",
        webhookId: "wh-1",
        blockNumber: "12345",
        txHash: "0xdeadbeef",
        logIndex: 0,
        decodedArgs: { from: "0x1" },
        firedAt: "2026-02-01T00:00:00.000Z"
      }
    ])
    const { repo } = makeBundle()
    const logs = await repo.logs("wh-1", 25)
    expect(logs).toHaveLength(1)
    const first = logs[0]!
    expect(first.firedAt).toBeInstanceOf(Date)
    expect(first.decodedArgs).toEqual({ from: "0x1" })
    const url = (fetchMock.mock.calls[0] as [string])[0]
    expect(url).toContain("limit=25")
  })
})
