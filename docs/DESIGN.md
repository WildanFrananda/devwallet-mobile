---
name: DevWallet
colors:
  surface: '#121319'
  surface-dim: '#121319'
  surface-bright: '#393840'
  surface-container-lowest: '#0d0e14'
  surface-container-low: '#1b1b22'
  surface-container: '#1f1f26'
  surface-container-high: '#292930'
  surface-container-highest: '#34343b'
  on-surface: '#e4e1eb'
  on-surface-variant: '#c6c5d5'
  inverse-surface: '#e4e1eb'
  inverse-on-surface: '#303037'
  outline: '#908f9e'
  outline-variant: '#454652'
  surface-tint: '#bdc2ff'
  primary: '#bdc2ff'
  on-primary: '#121f8b'
  primary-container: '#5e6ad2'
  on-primary-container: '#fdfaff'
  inverse-primary: '#4854bb'
  secondary: '#c0c3f2'
  on-secondary: '#292d53'
  secondary-container: '#42466e'
  on-secondary-container: '#b1b5e3'
  tertiary: '#ffb867'
  on-tertiary: '#482900'
  tertiary-container: '#a56500'
  on-tertiary-container: '#fffaf8'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dfe0ff'
  primary-fixed-dim: '#bdc2ff'
  on-primary-fixed: '#000965'
  on-primary-fixed-variant: '#2e3aa2'
  secondary-fixed: '#dfe0ff'
  secondary-fixed-dim: '#c0c3f2'
  on-secondary-fixed: '#13183d'
  on-secondary-fixed-variant: '#3f446b'
  tertiary-fixed: '#ffddbb'
  tertiary-fixed-dim: '#ffb867'
  on-tertiary-fixed: '#2b1700'
  on-tertiary-fixed-variant: '#673d00'
  background: '#121319'
  on-background: '#e4e1eb'
  surface-variant: '#34343b'
typography:
  headline-lg: { fontFamily: Inter, fontSize: 32px, fontWeight: '600', lineHeight: 40px, letterSpacing: -0.02em }
  headline-md: { fontFamily: Inter, fontSize: 24px, fontWeight: '600', lineHeight: 32px, letterSpacing: -0.01em }
  body-lg: { fontFamily: Inter, fontSize: 16px, fontWeight: '400', lineHeight: 24px }
  body-md: { fontFamily: Inter, fontSize: 14px, fontWeight: '400', lineHeight: 20px }
  mono-label-sm: { fontFamily: Geist Mono, fontSize: 11px, fontWeight: '500', lineHeight: 16px, letterSpacing: 0.05em }
  mono-data-md: { fontFamily: Geist Mono, fontSize: 14px, fontWeight: '400', lineHeight: 20px }
  mono-data-sm: { fontFamily: Geist Mono, fontSize: 12px, fontWeight: '400', lineHeight: 18px }
rounded: { sm: 0.25rem, DEFAULT: 0.5rem, md: 0.75rem, lg: 1rem, xl: 1.5rem, full: 9999px }
spacing: { space-xs: 4px, space-sm: 8px, space-md: 12px, space-lg: 16px, space-xl: 24px, space-xxl: 40px }
---

# DevWallet Design System

> Source of truth for visual design. Implemented in `src/theme/`. Generated via
> Stitch AI, anchored to a Linear/Vercel-restraint aesthetic. **Dark-mode only.**
>
> **Token reconciliation note:** the YAML frontmatter above is the canonical
> palette (matches the rendered preview). `src/theme/colors.ts` exposes these as
> `palette.*` plus a `colors.*` semantic layer that components import. Earlier
> prose drafts referenced a darker variant (`#08090A`/`#0F1011`); the YAML wins.

## Brand & Style
Engineered for surgical precision and extreme restraint, for the developer and
power-user crypto demographic. Avoids the "playful" tropes of consumer fintech —
a technical, utility-first aesthetic mirroring a high-end IDE or terminal. The
emotional response: total control, absolute clarity. Minimalism + Technical
Modernism: flat surfaces, zero-depth shadows, high-density information. The
developer-tool vibe comes from strict hierarchy — content is the interface,
chrome is reduced to 1px hairline dividers.

## Colors
Deep obsidian foundation. Contrast from structural hairline borders, not shadows.
- **Background & Surfaces:** three near-black tiers define spatial grouping.
- **Typography:** off-white primary text; secondary + muted tiers for hierarchy.
- **Accent:** indigo primary used sparingly — primary CTA + active states only.
- **Chain identity:** specific hex reserved for small indicator dots / mini-logos,
  never large surfaces.

## Typography
Dual-font strategy: **Inter** for UI; **Geist Mono** for hashes, addresses,
amounts, and eyebrow labels. **Eyebrow rule:** small uppercase monospace labels
above sections / as metadata headers reinforce the developer-tool aesthetic.

## Layout & Spacing
Strict 4px grid, generous negative space. Mobile uses 16px side margins.
High internal padding, large external margins → "islands" of clear information.
1px hairline borders (`outline-variant #454652`) separate content zones.

## Elevation & Depth
Strictly 2D — no shadows. Hierarchy from subtle tonal tier shifts + 1px hairline
borders. Modals: solid 1px border, no blur/shadow, slightly lighter tier.

## Shapes
8px (`rounded md`) standard for interactive components + containers. Nested
elements step down to 4px. Chain identity dots always perfectly circular.

## Components
- **Buttons:** primary solid indigo `#5e6ad2` / off-white text; secondary tier
  surface + 1px border + muted text; ghost = text only.
- **Inputs:** darkest tier background + 1px hairline border; focus = 1px indigo.
- **Chips:** small rectangular, Geist Mono text, neutral `#1f1f26` background.
- **Lists:** rows separated by 1px hairline; pressed row → interactive tier.
- **Wallet addresses:** always Geist Mono, middle-truncated (`0x123...abc`).
- **Cards:** no shadow, flat `surface #121319` + `outline-variant` border.
- **Data viz:** low-chroma semantic colors, thin 1–1.5px lines.

## Implementation
| Token group | File |
|-------------|------|
| Colors (palette + semantic + chain) | `src/theme/colors.ts` |
| Typography (Inter + Geist Mono) | `src/theme/typography.ts` |
| Spacing + radius + hairline | `src/theme/spacing.ts` |
| Barrel export `theme` | `src/theme/index.ts` |

**Rule:** never hardcode a hex / font size / radius in a component — import from
`src/theme`. This keeps every screen rendering identically as the 34 legacy
light-mode screens migrate to this dark system during Phase 5.

**Fonts pending:** add Inter + Geist Mono to `assets/fonts/` and link via
`react-native.config.js` before family names resolve (RN falls back to System /
platform monospace until then).
