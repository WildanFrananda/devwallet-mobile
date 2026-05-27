import { Chain } from "./chains.enum"

/**
 * Blockscout-compatible API base URLs per EVM chain. Blockscout exposes the
 * Etherscan-style `?module=account&action=txlist` endpoint with no API key.
 * Polygon Amoy + Base Sepolia have official Blockscout deployments; switch
 * to Etherscan/Polygonscan if env var is set in Phase 2.
 */
class TxHistoryEndpoints {
  private static readonly map: Partial<Record<Chain, string>> = {
    [Chain.EVM_SEPOLIA]: "https://eth-sepolia.blockscout.com/api",
    [Chain.EVM_POLYGON_AMOY]: "https://amoy.polygonscan.com/api",
    [Chain.EVM_BASE_SEPOLIA]: "https://base-sepolia.blockscout.com/api"
  }

  public static for(chain: Chain): string | null {
    return TxHistoryEndpoints.map[chain] ?? null
  }
}

export { TxHistoryEndpoints }
