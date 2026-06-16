/**
 * DevWallet color tokens — single source of truth.
 *
 * Generated from the design system (see docs/DESIGN.md). The aesthetic is
 * Linear/Vercel-style restraint: flat obsidian surfaces, hairline 1px borders
 * instead of shadows, indigo accent used sparingly. Dark-mode only for now.
 *
 * Two layers:
 *  - `palette`   — raw Material-3-style tokens straight from the design file.
 *  - `colors`    — semantic aliases the app actually consumes. ALWAYS import
 *                  from `colors` in components; never hardcode a hex.
 */

export const palette = {
  // v2 "Warm Technical": base tiers shifted +R channel (blue-lead → red-lead).
  // Reads identical to the eye, registers as warm not cold-navy.
  surface: "#141318",
  surfaceDim: "#141318",
  surfaceBright: "#393840",
  surfaceContainerLowest: "#0f0e13",
  surfaceContainerLow: "#1d1c22",
  surfaceContainer: "#212027",
  surfaceContainerHigh: "#292930",
  surfaceContainerHighest: "#34343b",
  onSurface: "#f3f1ec",
  onSurfaceVariant: "#cfccd4",
  outline: "#9a98a6",
  outlineVariant: "#454652",
  primary: "#bdc2ff",
  onPrimary: "#121f8b",
  primaryContainer: "#5e6ad2",
  onPrimaryContainer: "#fdfaff",
  inversePrimary: "#4854bb",
  secondary: "#c0c3f2",
  onSecondary: "#292d53",
  secondaryContainer: "#42466e",
  onSecondaryContainer: "#b1b5e3",
  tertiary: "#ffb867",
  onTertiary: "#482900",
  tertiaryContainer: "#a56500",
  error: "#ffb4ab",
  onError: "#690005",
  errorContainer: "#93000a",
  onErrorContainer: "#ffdad6",
  background: "#121319",
  onBackground: "#e4e1eb"
} as const

/**
 * Chain identity colors — used ONLY for small circular dots / mini-logos,
 * never as large surfaces (per DESIGN.md). Keyed by Chain enum string value.
 */
export const chainColors = {
  "evm:sepolia": "#627EEA",
  "evm:polygon-amoy": "#8247E5",
  "evm:base-sepolia": "#0052FF",
  "bitcoin:testnet": "#F7931A",
  "solana:devnet": "#14F195",
  "cosmos:theta-testnet": "#5064FB",
  "xrpl:testnet": "#C8CCD0",
  "starknet:sepolia": "#EC796B"
} as const

/**
 * Semantic layer — what components import. Maps intent → palette token.
 * Keeps the 34 legacy hardcoded-hex screens converging onto one vocabulary.
 */
export const colors = {
  // Backgrounds / elevation (warm obsidian tiers + base)
  background: palette.surfaceContainerLowest, // #0f0e13 — app base
  surface: palette.surface, // #141318 — cards, sheets
  surfaceElevated: palette.surfaceContainer, // #212027 — active/selected
  surfaceInteractive: palette.surfaceContainerLow, // #1d1c22 — pressed/hover row

  // Tonal elevation ladder (v2 depth). Cards lift via lightness, not just
  // hairlines. idle cards → elevation1; active/pressed → elevation2; sheets → 3.
  elevation0: "#0f0e13", // = background
  elevation1: "#181720", // resting cards (~8% lift)
  elevation2: "#201f29", // active / selected (~12%)
  elevation3: "#272630", // modals / sheets (~16%)

  // Structure — hairline borders define idle layout
  border: palette.outlineVariant, // #454652
  borderStrong: palette.outline, // #9a98a6

  // Text hierarchy (warm off-white)
  textPrimary: palette.onSurface, // #f3f1ec
  textSecondary: palette.onSurfaceVariant, // #cfccd4
  textMuted: palette.outline, // #9a98a6

  // Accent — indigo, used sparingly (primary CTA + active state)
  accent: palette.primaryContainer, // #5e6ad2
  accentText: palette.primary, // #bdc2ff on dark
  accentPressed: "#5a5fc4", // pressed CTA (warmer than #5056b8)
  onAccent: palette.onPrimaryContainer, // #fdfaff text on solid accent

  // Second accent — amber, for success/warmth STATUS only, never UI chrome
  accentWarm: palette.tertiary, // #ffb867

  // Soft focal glows — ONE per screen, tinted not black, ≤0.16 opacity
  accentGlow: "rgba(94,106,210,0.14)",
  accentWarmGlow: "rgba(255,184,103,0.12)",
  successGlow: "rgba(76,183,130,0.10)",

  // Semantic (low-chroma, never neon)
  success: "#4CB782",
  warning: palette.tertiary, // #ffb867
  error: palette.error, // #ffb4ab
  info: "#7E89E0",

  // Surfaces for status tints (subtle)
  successContainer: "#0f2a1d",
  warningContainer: palette.tertiaryContainer, // #a56500
  errorContainer: palette.errorContainer, // #93000a

  // Pure transparent helper
  transparent: "transparent"
} as const

export type Colors = typeof colors
export type ChainColorKey = keyof typeof chainColors
