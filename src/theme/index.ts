/**
 * DevWallet theme — single import surface.
 *
 *   import { colors, typography, spacing, radius } from "@theme"
 *
 * Aesthetic: Linear/Vercel restraint — flat obsidian surfaces, 1px hairline
 * borders (no shadows), indigo accent used sparingly, Geist Mono for all
 * technical data. Full spec in docs/DESIGN.md. Dark-mode only.
 *
 * Rule: NEVER hardcode a hex/size/radius in a component. Pull from here so the
 * design system stays single-source and every screen renders identically.
 */

export { colors, palette, chainColors } from "./colors"
export type { Colors, ChainColorKey } from "./colors"

export { typography, fontFamily } from "./typography"
export type { Typography } from "./typography"

export { spacing, radius, hairline } from "./spacing"
export type { Spacing, Radius } from "./spacing"

export { duration, easing, spring, stagger } from "./motion"

import { colors } from "./colors"
import { typography, fontFamily } from "./typography"
import { spacing, radius, hairline } from "./spacing"
import { duration, easing, spring, stagger } from "./motion"

/** Convenience aggregate when a single `theme` object is preferred. */
export const theme = {
  colors,
  typography,
  fontFamily,
  spacing,
  radius,
  hairline,
  motion: { duration, easing, spring, stagger }
} as const

export type Theme = typeof theme
