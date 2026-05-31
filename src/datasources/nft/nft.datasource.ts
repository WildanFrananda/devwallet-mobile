import { Injectable } from "react-native-mobile-mvvm/di"
import Config from "react-native-config"
import { Chain } from "../../core/constants/chains.enum"
import { callAndLog } from "../../core/network/logging-transport"
import Nft from "../../models/nft.model"

type AlchemyNftRaw = {
  contract?: { address?: string; name?: string }
  tokenId?: string
  name?: string
  description?: string
  image?: { cachedUrl?: string | null; originalUrl?: string | null; thumbnailUrl?: string | null }
}

type AlchemyResponse = {
  ownedNfts?: ReadonlyArray<AlchemyNftRaw>
}

type HeliusAsset = {
  id: string
  content?: {
    metadata?: { name?: string; description?: string }
    links?: { image?: string }
  }
  grouping?: ReadonlyArray<{ group_key?: string; group_value?: string }>
}

type HeliusResponse = {
  result?: {
    items?: ReadonlyArray<HeliusAsset>
  }
}

/**
 * NFT lookup via Alchemy NFT API (EVM) + Helius DAS (Solana). Both APIs
 * return pre-parsed metadata so we don't have to walk per-token URIs or
 * IPFS gateways manually.
 */
@Injectable()
class NftDatasource {
  public fetch(chain: Chain, address: string): Promise<Nft[]> {
    if (chain === Chain.EVM_SEPOLIA || chain === Chain.EVM_POLYGON_AMOY || chain === Chain.EVM_BASE_SEPOLIA) {
      return this.fetchEvm(chain, address)
    }
    if (chain === Chain.SOLANA_DEVNET) {
      return this.fetchSolana(chain, address)
    }
    // Bitcoin / Cosmos / XRPL / StarkNet — no NFT scope this phase.
    return Promise.resolve([])
  }

  private async fetchEvm(chain: Chain, address: string): Promise<Nft[]> {
    const key = NftDatasource.alchemyKey(chain)
    if (!key) return []
    const base = NftDatasource.alchemyBase(chain, key)
    const url = `${base}/getNFTsForOwner?owner=${encodeURIComponent(address)}&withMetadata=true&pageSize=20`
    const json = await callAndLog<AlchemyResponse>({
      chain,
      endpoint: base,
      method: "alchemy.getNFTsForOwner",
      params: { address },
      run: async () => {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
        return (await res.json()) as AlchemyResponse
      }
    })
    const list = json.ownedNfts ?? []
    return list.flatMap(raw => {
      const contractAddress = raw.contract?.address
      const tokenId = raw.tokenId
      if (!contractAddress || !tokenId) return []
      return [
        new Nft({
          chain,
          contractAddress,
          tokenId,
          name: raw.name ?? `#${tokenId}`,
          image:
            raw.image?.cachedUrl ?? raw.image?.thumbnailUrl ?? raw.image?.originalUrl ?? null,
          description: raw.description ?? null,
          collection: raw.contract?.name ?? null
        })
      ]
    })
  }

  private async fetchSolana(chain: Chain, address: string): Promise<Nft[]> {
    const key = Config.HELIUS_API_KEY
    if (!key) return []
    const url = `https://devnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`
    const json = await callAndLog<HeliusResponse>({
      chain,
      endpoint: url,
      method: "helius.getAssetsByOwner",
      params: { address },
      run: async () => {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "devwallet-nft",
            method: "getAssetsByOwner",
            params: {
              ownerAddress: address,
              page: 1,
              limit: 20
            }
          })
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
        return (await res.json()) as HeliusResponse
      }
    })
    const items = json.result?.items ?? []
    return items.map(item => {
      const collection = item.grouping?.find(g => g.group_key === "collection")?.group_value ?? null
      return new Nft({
        chain,
        contractAddress: collection ?? item.id,
        tokenId: item.id,
        name: item.content?.metadata?.name ?? "Untitled",
        image: item.content?.links?.image ?? null,
        description: item.content?.metadata?.description ?? null,
        collection
      })
    })
  }

  private static alchemyKey(chain: Chain): string | undefined {
    switch (chain) {
      case Chain.EVM_SEPOLIA:
        return Config.ALCHEMY_API_KEY_SEPOLIA
      case Chain.EVM_POLYGON_AMOY:
        return Config.ALCHEMY_API_KEY_AMOY
      case Chain.EVM_BASE_SEPOLIA:
        return Config.ALCHEMY_API_KEY_BASE
      default:
        return undefined
    }
  }

  private static alchemyBase(chain: Chain, key: string): string {
    switch (chain) {
      case Chain.EVM_SEPOLIA:
        return `https://eth-sepolia.g.alchemy.com/nft/v3/${key}`
      case Chain.EVM_POLYGON_AMOY:
        return `https://polygon-amoy.g.alchemy.com/nft/v3/${key}`
      case Chain.EVM_BASE_SEPOLIA:
        return `https://base-sepolia.g.alchemy.com/nft/v3/${key}`
      default:
        throw new Error(`No Alchemy NFT base configured for ${chain}`)
    }
  }
}

export default NftDatasource
