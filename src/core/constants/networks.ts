import { Chain } from "./chains.enum"

type NetworkConfig = {
  chain: Chain
  name: string
  symbol: string
  decimals: number
  rpcUrl: string
  explorerUrl: string | null
  faucetUrl: string | null
}

class NetworkRegistry {
  private static readonly registry: Record<Chain, NetworkConfig> = {
    [Chain.EVM_SEPOLIA]: {
      chain: Chain.EVM_SEPOLIA,
      name: "Sepolia",
      symbol: "ETH",
      decimals: 18,
      rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
      explorerUrl: "https://sepolia.etherscan.io",
      faucetUrl: null
    },
    [Chain.EVM_HOLESKY]: {
      chain: Chain.EVM_HOLESKY,
      name: "Holesky",
      symbol: "ETH",
      decimals: 18,
      rpcUrl: "https://ethereum-holesky-rpc.publicnode.com",
      explorerUrl: "https://holesky.etherscan.io",
      faucetUrl: null
    },
    [Chain.EVM_POLYGON_AMOY]: {
      chain: Chain.EVM_POLYGON_AMOY,
      name: "Polygon Amoy",
      symbol: "MATIC",
      decimals: 18,
      rpcUrl: "https://rpc-amoy.polygon.technology",
      explorerUrl: "https://amoy.polygonscan.com",
      faucetUrl: null
    },
    [Chain.EVM_BASE_SEPOLIA]: {
      chain: Chain.EVM_BASE_SEPOLIA,
      name: "Base Sepolia",
      symbol: "ETH",
      decimals: 18,
      rpcUrl: "https://sepolia.base.org",
      explorerUrl: "https://sepolia.basescan.org",
      faucetUrl: null
    },
    [Chain.EVM_LOCAL]: {
      chain: Chain.EVM_LOCAL,
      name: "Anvil local",
      symbol: "ETH",
      decimals: 18,
      rpcUrl: "http://127.0.0.1:8545",
      explorerUrl: null,
      faucetUrl: null
    },
    [Chain.BITCOIN_TESTNET]: {
      chain: Chain.BITCOIN_TESTNET,
      name: "Bitcoin testnet",
      symbol: "tBTC",
      decimals: 8,
      rpcUrl: "https://blockstream.info/testnet/api",
      explorerUrl: "https://blockstream.info/testnet",
      faucetUrl: null
    },
    [Chain.SOLANA_DEVNET]: {
      chain: Chain.SOLANA_DEVNET,
      name: "Solana devnet",
      symbol: "SOL",
      decimals: 9,
      rpcUrl: "https://api.devnet.solana.com",
      explorerUrl: "https://explorer.solana.com",
      faucetUrl: null
    },
    [Chain.COSMOS_THETA]: {
      chain: Chain.COSMOS_THETA,
      name: "Cosmos theta",
      symbol: "ATOM",
      decimals: 6,
      rpcUrl: "https://rpc.sentry-02.theta-testnet.polypore.xyz",
      explorerUrl: null,
      faucetUrl: null
    },
    [Chain.XRPL_TESTNET]: {
      chain: Chain.XRPL_TESTNET,
      name: "XRPL testnet",
      symbol: "XRP",
      decimals: 6,
      rpcUrl: "wss://s.altnet.rippletest.net:51233",
      explorerUrl: "https://testnet.xrpl.org",
      faucetUrl: null
    },
    [Chain.STARKNET_SEPOLIA]: {
      chain: Chain.STARKNET_SEPOLIA,
      name: "Starknet sepolia",
      symbol: "STRK",
      decimals: 18,
      rpcUrl: "https://starknet-sepolia.public.blastapi.io/rpc/v0_7",
      explorerUrl: "https://sepolia.starkscan.co",
      faucetUrl: null
    }
  }

  public static get(chain: Chain): NetworkConfig {
    return NetworkRegistry.registry[chain]
  }

  public static all(): NetworkConfig[] {
    return Object.values(NetworkRegistry.registry)
  }

  public static keys(): Chain[] {
    return Object.keys(NetworkRegistry.registry) as Chain[]
  }
}

export { NetworkRegistry, type NetworkConfig }
