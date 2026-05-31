import { Chain } from "../core/constants/chains.enum"

class Nft {
  public readonly chain: Chain
  public readonly contractAddress: string
  public readonly tokenId: string
  public readonly name: string
  public readonly image: string | null
  public readonly description: string | null
  public readonly collection: string | null

  public constructor(params: {
    chain: Chain
    contractAddress: string
    tokenId: string
    name: string
    image?: string | null
    description?: string | null
    collection?: string | null
  }) {
    this.chain = params.chain
    this.contractAddress = params.contractAddress
    this.tokenId = params.tokenId
    this.name = params.name
    this.image = params.image ?? null
    this.description = params.description ?? null
    this.collection = params.collection ?? null
  }

  /** Stable key for FlatList — chain + contract + tokenId is globally unique. */
  public key(): string {
    return `${this.chain}:${this.contractAddress}:${this.tokenId}`
  }
}

export default Nft
