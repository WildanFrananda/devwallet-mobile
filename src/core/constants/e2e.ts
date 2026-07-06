import Config from "react-native-config"

/**
 * True in Detox E2E builds (`.env.e2e` sets `E2E_MOCK=1`). Detox treats any
 * pending JS timer shorter than ~1.5s as "app busy" and refuses to act until
 * it clears — so decorative infinite loops (a blinking cursor, a status pulse,
 * a 1s countdown tick) would hang every test. Gate those behind this flag so
 * the app idles under test while staying lively in normal builds. Long polls
 * (≥1.5s auto-refresh) are ignored by Detox and need no gating.
 *
 * NB: named `e2e.ts`, not `env.ts` — a sibling `env.d.ts` augments the
 * `react-native-config` module, and a same-stem `.ts` would shadow it.
 */
export const IS_E2E = Config.E2E_MOCK === "1"
