/**
 * DevWallet typography tokens — dual-font strategy (see docs/DESIGN.md).
 *
 *  - Inter      → all UI: headings, body, buttons, labels.
 *  - Geist Mono → addresses, hashes, amounts, chain IDs, eyebrow labels.
 *
 * Eyebrow rule: small uppercase monospace labels above sections reinforce the
 * developer-tool aesthetic. Use `mono.labelSm` with letterSpacing for those.
 *
 * NOTE: fonts must be added to assets/fonts/ + linked (react-native.config.js)
 * before these family names resolve. Until then RN falls back to System /
 * platform monospace, so the scale still renders correctly.
 */

export const fontFamily = {
  sans: "Inter",
  mono: "Geist Mono"
} as const

export const typography = {
  // Inter — UI
  headlineLg: {
    fontFamily: fontFamily.sans,
    fontSize: 32,
    fontWeight: "700", // v2: heavier hero weight for organic hierarchy
    lineHeight: 40,
    letterSpacing: -0.64 // -0.02em * 32
  },
  headlineMd: {
    fontFamily: fontFamily.sans,
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 32,
    letterSpacing: -0.24 // -0.01em * 24
  },
  titleMd: {
    fontFamily: fontFamily.sans,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22
  },
  bodyLg: {
    fontFamily: fontFamily.sans,
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24
  },
  bodyMd: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: "500", // v2: +1 weight for warmth in running text
    lineHeight: 22
  },
  labelMd: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18
  },
  // v2 sans eyebrow — replaces mono for SECTION headers (mono = data only now)
  labelXs: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },

  // Geist Mono — technical data + eyebrows
  monoLabelSm: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 16,
    letterSpacing: 0.55, // 0.05em * 11 — eyebrow tracking
    textTransform: "uppercase"
  },
  monoDataMd: {
    fontFamily: fontFamily.mono,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20
  },
  monoDataSm: {
    fontFamily: fontFamily.mono,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 18
  }
} as const

export type Typography = typeof typography
