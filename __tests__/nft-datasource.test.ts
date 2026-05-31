import "reflect-metadata"
import NftDatasource from "../src/datasources/nft/nft.datasource"
import { Chain } from "../src/core/constants/chains.enum"

jest.mock("react-native-config", () => ({
  __esModule: true,
  default: {
    ALCHEMY_API_KEY_SEPOLIA: "key-sep",
    ALCHEMY_API_KEY_AMOY: "key-amoy",
    ALCHEMY_API_KEY_BASE: "key-base",
    HELIUS_API_KEY: "key-helius"
  }
}))

describe("NftDatasource", () => {
  const realFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = realFetch
  })

  it("returns empty array for unsupported chains", async () => {
    const ds = new NftDatasource()
    expect(await ds.fetch(Chain.BITCOIN_TESTNET, "addr")).toEqual([])
    expect(await ds.fetch(Chain.XRPL_TESTNET, "addr")).toEqual([])
    expect(await ds.fetch(Chain.COSMOS_THETA, "addr")).toEqual([])
    expect(await ds.fetch(Chain.STARKNET_SEPOLIA, "addr")).toEqual([])
  })

  it("parses Alchemy NFT response for EVM chains", async () => {
    const fakeFetch = jest.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            ownedNfts: [
              {
                contract: { address: "0xCONTRACT", name: "Cool" },
                tokenId: "42",
                name: "Token #42",
                description: "first nft",
                image: { cachedUrl: "https://img/42", originalUrl: null }
              },
              {
                contract: { address: "0xCONTRACT2" },
                tokenId: "99",
                image: { originalUrl: "https://img/99" }
              }
            ]
          }),
          { status: 200 }
        )
      )
    )
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    globalThis.fetch = fakeFetch as unknown as typeof globalThis.fetch

    const ds = new NftDatasource()
    const list = await ds.fetch(Chain.EVM_SEPOLIA, "0xowner")
    expect(list).toHaveLength(2)
    expect(list[0]!.name).toBe("Token #42")
    expect(list[0]!.image).toBe("https://img/42")
    expect(list[0]!.collection).toBe("Cool")
    expect(list[1]!.name).toBe("#99")
    expect(list[1]!.collection).toBeNull()
    expect(fakeFetch).toHaveBeenCalledTimes(1)
    const firstCall = fakeFetch.mock.calls[0] as ReadonlyArray<unknown> | undefined
    const firstArg = firstCall?.[0]
    const requestedUrl = typeof firstArg === "string" ? firstArg : ""
    expect(requestedUrl).toContain("eth-sepolia.g.alchemy.com")
    expect(requestedUrl).toContain("key-sep")
  })

  it("parses Helius DAS response for Solana devnet", async () => {
    const fakeFetch = jest.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            result: {
              items: [
                {
                  id: "asset-1",
                  content: {
                    metadata: { name: "Mango", description: "sweet" },
                    links: { image: "https://img/mango" }
                  },
                  grouping: [{ group_key: "collection", group_value: "FruitDAO" }]
                }
              ]
            }
          }),
          { status: 200 }
        )
      )
    )
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    globalThis.fetch = fakeFetch as unknown as typeof globalThis.fetch

    const ds = new NftDatasource()
    const list = await ds.fetch(Chain.SOLANA_DEVNET, "owner-pubkey")
    expect(list).toHaveLength(1)
    expect(list[0]!.name).toBe("Mango")
    expect(list[0]!.image).toBe("https://img/mango")
    expect(list[0]!.collection).toBe("FruitDAO")
    expect(list[0]!.contractAddress).toBe("FruitDAO")
    expect(fakeFetch).toHaveBeenCalledWith(
      expect.stringContaining("devnet.helius-rpc.com"),
      expect.objectContaining({ method: "POST" })
    )
  })

  it("returns empty array when Alchemy returns no NFTs", async () => {
    const fakeFetch = jest.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ ownedNfts: [] }), { status: 200 }))
    )
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    globalThis.fetch = fakeFetch as unknown as typeof globalThis.fetch

    const ds = new NftDatasource()
    expect(await ds.fetch(Chain.EVM_BASE_SEPOLIA, "0xowner")).toEqual([])
  })
})
