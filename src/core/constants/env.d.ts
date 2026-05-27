declare module "react-native-config" {
  interface Env {
    API_BASE_URL: string
    WS_BASE_URL: string
    FAUCET_WS_URL: string
    DEFAULT_CHAIN: string
    SENTRY_DSN?: string
    ANALYTICS_KEY?: string
    GIT_COMMIT?: string
  }
  const Config: Env
  export default Config
}
