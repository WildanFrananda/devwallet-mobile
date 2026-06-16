/**
 * DevWallet spacing + shape tokens (see docs/DESIGN.md).
 *
 * 4px grid. Mobile uses 16px (lg) side margins. Components: high internal
 * padding, large external margins → "islands" of clear information.
 *
 * v2 radius is a DEPTH LADDER, not one size: data chips read precise (2px),
 * buttons punch forward (8px), cards soften + recede (12px), sheets (16px).
 * Rule: data 2 · inputs 6 · buttons 8 · cards 12 · sheets 16. Never >16 on
 * anything small. Chain dots are always full circles.
 */

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 40
} as const

export const radius = {
  xs: 2, // data chips / structured tags — precise
  sm: 6, // inputs (was 4)
  md: 8, // buttons — punch forward
  lg: 12, // cards / Section body — soften, recede
  xl: 16, // modals / sheets
  full: 9999 // dots, pills, avatars
} as const

/** Hairline border width — structure comes from 1px lines, not shadows. */
export const hairline = 1

export type Spacing = typeof spacing
export type Radius = typeof radius
