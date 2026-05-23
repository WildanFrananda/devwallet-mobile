export const Tokens = {
  // Storage
  MmkvStorage: Symbol.for("MmkvStorage"),
  Keychain: Symbol.for("Keychain"),

  // Crypto
  KeyringService: Symbol.for("KeyringService"),

  // Network — RPC clients
  EvmRpc: Symbol.for("EvmRpc"),
  BitcoinRpc: Symbol.for("BitcoinRpc"),
  SolanaRpc: Symbol.for("SolanaRpc"),
  CosmosRpc: Symbol.for("CosmosRpc"),
  XrplRpc: Symbol.for("XrplRpc"),
  StarknetRpc: Symbol.for("StarknetRpc"),

  // Network — HTTP
  ApiClient: Symbol.for("ApiClient"),

  // Repositories (per feature)
  OnboardingRepository: Symbol.for("OnboardingRepository"),
  WalletRepository: Symbol.for("WalletRepository"),
  FaucetRepository: Symbol.for("FaucetRepository"),
  RpcLogRepository: Symbol.for("RpcLogRepository"),
  ContractRepository: Symbol.for("ContractRepository"),
  TxReplayRepository: Symbol.for("TxReplayRepository"),
  WebhookRepository: Symbol.for("WebhookRepository"),
  GasRepository: Symbol.for("GasRepository")
} as const

export type TokenKey = keyof typeof Tokens
