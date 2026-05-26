import { Chain } from "./chains.enum"

type NetworkConfig = {
  chain: Chain
  name: string
  rpcUrl: string
  explorerUrl: string | null
  faucetUrl: string | null
}

class NetworkRegistry {
  private static readonly registry: Record<Chain, NetworkConfig> = {
    [Chain.EVM_SEPOLIA]: {
      chain: Chain.EVM_SEPOLIA,
      name: "Sepolia",
      rpcUrl: "",
      explorerUrl: "https://sepolia.etherscan.io",
      faucetUrl: null
    },
    [Chain.EVM_HOLESKY]: {
      chain: Chain.EVM_HOLESKY,
      name: "Holesky",
      rpcUrl: "",
      explorerUrl: "https://holesky.etherscan.io",
      faucetUrl: null
    },
    [Chain.EVM_LOCAL]: {
      chain: Chain.EVM_LOCAL,
      name: "Anvil local",
      rpcUrl: "http://127.0.0.1:8545",
      explorerUrl: null,
      faucetUrl: null
    },
    [Chain.BITCOIN_TESTNET]: {
      chain: Chain.BITCOIN_TESTNET,
      name: "Bitcoin testnet",
      rpcUrl: "",
      explorerUrl: "https://blockstream.info/testnet",
      faucetUrl: null
    },
    [Chain.SOLANA_DEVNET]: {
      chain: Chain.SOLANA_DEVNET,
      name: "Solana devnet",
      rpcUrl: "https://api.devnet.solana.com",
      explorerUrl: "https://explorer.solana.com",
      faucetUrl: null
    },
    [Chain.COSMOS_THETA]: {
      chain: Chain.COSMOS_THETA,
      name: "Cosmos theta",
      rpcUrl: "",
      explorerUrl: null,
      faucetUrl: null
    },
    [Chain.XRPL_TESTNET]: {
      chain: Chain.XRPL_TESTNET,
      name: "XRPL testnet",
      rpcUrl: "wss://s.altnet.rippletest.net:51233",
      explorerUrl: "https://testnet.xrpl.org",
      faucetUrl: null
    },
    [Chain.STARKNET_SEPOLIA]: {
      chain: Chain.STARKNET_SEPOLIA,
      name: "Starknet sepolia",
      rpcUrl: "",
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
