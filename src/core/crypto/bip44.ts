import { Chain } from "../constants/chains.enum"

/**
 * SLIP-0044 registered coin types. EVM chains share 60 (Ethereum-compatible).
 * https://github.com/satoshilabs/slips/blob/master/slip-0044.md
 */
class Bip44Paths {
  private static readonly coinTypes: Record<Chain, number> = {
    [Chain.EVM_SEPOLIA]: 60,
    [Chain.EVM_HOLESKY]: 60,
    [Chain.EVM_POLYGON_AMOY]: 60,
    [Chain.EVM_BASE_SEPOLIA]: 60,
    [Chain.EVM_LOCAL]: 60,
    [Chain.BITCOIN_TESTNET]: 1, // testnet uses 1, mainnet 0
    [Chain.SOLANA_DEVNET]: 501,
    [Chain.COSMOS_THETA]: 118,
    [Chain.XRPL_TESTNET]: 144,
    [Chain.STARKNET_SEPOLIA]: 9004
  }

  public static coinType(chain: Chain): number {
    return Bip44Paths.coinTypes[chain]
  }

  public static path(chain: Chain, addressIndex: number = 0, account: number = 0, change: 0 | 1 = 0): string {
    const coinType = Bip44Paths.coinType(chain)
    return `m/44'/${coinType}'/${account}'/${change}/${addressIndex}`
  }
}

export default Bip44Paths
