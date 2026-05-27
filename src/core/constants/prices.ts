import { Chain } from "./chains.enum"

/**
 * Phase 1 hardcoded testnet→USD rates for the dashboard total header. These
 * are NOT live prices — testnet assets have no real value. Phase 2 swaps
 * this for a real price oracle (CoinGecko/Pyth).
 *
 * Tokens not yet supported in the portfolio header (ERC-20s, SPL) are
 * priced via a lookup in this map only if their symbol matches a native.
 */
class PriceRegistry {
  private static readonly nativeUsd: Record<Chain, number> = {
    [Chain.EVM_SEPOLIA]: 3000,
    [Chain.EVM_POLYGON_AMOY]: 0.5,
    [Chain.EVM_BASE_SEPOLIA]: 3000,
    [Chain.BITCOIN_TESTNET]: 60000,
    [Chain.SOLANA_DEVNET]: 150,
    [Chain.COSMOS_THETA]: 7,
    [Chain.XRPL_TESTNET]: 0.5,
    [Chain.STARKNET_SEPOLIA]: 1.5
  }

  public static native(chain: Chain): number {
    return PriceRegistry.nativeUsd[chain]
  }
}

export { PriceRegistry }
