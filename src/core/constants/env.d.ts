declare module "react-native-config" {
  interface Env {
    API_BASE_URL: string
    WS_BASE_URL: string
    FAUCET_WS_URL: string
    DEFAULT_CHAIN: string
    SENTRY_DSN?: string
    ANALYTICS_KEY?: string
    GIT_COMMIT?: string
    // Phase 4 — NFT Gallery (F-08)
    ALCHEMY_API_KEY_SEPOLIA?: string
    ALCHEMY_API_KEY_AMOY?: string
    ALCHEMY_API_KEY_BASE?: string
    HELIUS_API_KEY?: string
  }
  const Config: Env
  export default Config
}
