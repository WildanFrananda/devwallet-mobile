import { Chain } from "../core/constants/chains.enum"

class Account {
  public readonly chain: Chain
  public readonly address: string
  public readonly privateKey: `0x${string}`
  public readonly publicKey: `0x${string}`
  public readonly path: string
  public readonly index: number

  public constructor(params: {
    chain: Chain
    address: string
    privateKey: `0x${string}`
    publicKey: `0x${string}`
    path: string
    index: number
  }) {
    this.chain = params.chain
    this.address = params.address
    this.privateKey = params.privateKey
    this.publicKey = params.publicKey
    this.path = params.path
    this.index = params.index
  }

  /**
   * Sanitised representation safe for logs / UI. Never exposes privateKey.
   */
  public toJSON(): Omit<{ [K in keyof Account]: Account[K] }, "privateKey" | "toJSON"> {
    return {
      chain: this.chain,
      address: this.address,
      publicKey: this.publicKey,
      path: this.path,
      index: this.index
    }
  }
}

export default Account
