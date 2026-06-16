import { Easing } from "react-native"

/**
 * DevWallet motion vocabulary (v2 "Warm Technical"). Built on RN core
 * `Animated` — NO Reanimated/Moti dependency. Budget is hard-capped:
 *
 *   60% — ease-out fades / reveals (DEFAULT)
 *   30% — staggered entrances (mount only, ≤5 items, ≤300ms total)
 *   10% — spring on hero / CTA moments (≤3 elements per screen)
 *
 * Durations 120–240ms for interactions, never >350. Entrances ease-out,
 * exits ease-in, presses sharp. Refreshes SNAP — never re-stagger.
 */

export const duration = {
  quick: 120,
  normal: 180,
  slow: 240
} as const

export const easing = {
  out: Easing.bezier(0, 0, 0.2, 1), // entrances, fades — DEFAULT
  in: Easing.bezier(0.4, 0, 1, 1), // exits
  press: Easing.bezier(0.12, 0, 0.08, 1), // sharp micro-press
  inOut: Easing.bezier(0.4, 0, 0.2, 1) // ambient loops
} as const

/** Spring config for the 10% hero/CTA moments (Animated.spring). */
export const spring = {
  tension: 300,
  friction: 24
} as const

/** Default stagger between list-item entrances. */
export const stagger = 40

export type Duration = typeof duration
export type Easing_ = typeof easing
