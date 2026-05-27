import { Chain } from "./chains.enum"

type TokenSpec = {
  symbol: string
  contractAddress: `0x${string}`
  decimals: number
}

/**
 * Phase 1 hardcoded testnet ERC-20 list per chain. Addresses move/get
 * deprecated often — keep this file pinned to known-good contracts and
 * refresh when faucets break. NetworkConfig stays the source of truth
 * for native asset; this file only covers ERC-20s.
 */
class TokenRegistry {
  private static readonly registry: Partial<Record<Chain, ReadonlyArray<TokenSpec>>> = {
    [Chain.EVM_SEPOLIA]: [
      { symbol: "LINK", contractAddress: "0x779877A7B0D9E8603169DdbD7836e478b4624789", decimals: 18 },
      { symbol: "USDC", contractAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", decimals: 6 },
      { symbol: "WETH", contractAddress: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9", decimals: 18 }
    ],
    [Chain.EVM_POLYGON_AMOY]: [
      { symbol: "USDC", contractAddress: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582", decimals: 6 }
    ],
    [Chain.EVM_BASE_SEPOLIA]: [
      { symbol: "USDC", contractAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", decimals: 6 },
      { symbol: "WETH", contractAddress: "0x4200000000000000000000000000000000000006", decimals: 18 }
    ]
  }

  public static for(chain: Chain): ReadonlyArray<TokenSpec> {
    return TokenRegistry.registry[chain] ?? []
  }
}

export { TokenRegistry, type TokenSpec }
