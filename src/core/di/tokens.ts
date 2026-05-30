const Tokens = {
  // Storage
  MmkvStorage: Symbol.for("MmkvStorage"),
  Keychain: Symbol.for("Keychain"),
  Settings: Symbol.for("Settings"),

  // Crypto
  KeyringService: Symbol.for("KeyringService"),

  // Auth
  Pin: Symbol.for("Pin"),
  DeviceBinding: Symbol.for("DeviceBinding"),
  DeviceFingerprint: Symbol.for("DeviceFingerprint"),
  SecureStorage: Symbol.for("SecureStorage"),
  V03EncryptMigration: Symbol.for("V03EncryptMigration"),

  // Notifications
  Push: Symbol.for("Push"),

  // Lifecycle
  AutoLock: Symbol.for("AutoLock"),

  // Network — RPC clients
  EvmRpc: Symbol.for("EvmRpc"),
  BitcoinRpc: Symbol.for("BitcoinRpc"),
  SolanaRpc: Symbol.for("SolanaRpc"),
  CosmosRpc: Symbol.for("CosmosRpc"),
  XrplRpc: Symbol.for("XrplRpc"),
  StarknetRpc: Symbol.for("StarknetRpc"),

  // Network — HTTP
  ApiClient: Symbol.for("ApiClient"),

  // Datasources
  BalanceDatasource: Symbol.for("BalanceDatasource"),
  TokenDatasource: Symbol.for("TokenDatasource"),
  TxHistoryDatasource: Symbol.for("TxHistoryDatasource"),
  SignerDatasource: Symbol.for("SignerDatasource"),
  FaucetDatasource: Symbol.for("FaucetDatasource"),
  FeeDatasource: Symbol.for("FeeDatasource"),
  ContractCallerDatasource: Symbol.for("ContractCallerDatasource"),
  GasOracleDatasource: Symbol.for("GasOracleDatasource"),

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
export { Tokens }