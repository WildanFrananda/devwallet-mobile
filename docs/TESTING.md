# Testing — devwallet-mobile

## Layers

| Layer | Tool | Location | Run |
|-------|------|----------|-----|
| Unit (ViewModels, services, utils) | Jest + ts-jest | `__tests__/*.test.ts` | `bun run test` |
| Component | `@testing-library/react-native` (+ `@testing-library/jest-native` matchers) | `__tests__/components/*.test.tsx` | `bun run test` |
| Repository integration | Jest (mock fetch + in-memory MMKV/keychain) | `__tests__/*.repository*.test.ts` | `bun run test` |
| Keyring snapshot | Jest snapshot | `__tests__/keyring-snapshot.test.ts` | `bun run test` |
| E2E | Detox (iOS sim + Android emu) | `e2e/*.spec.ts` | `bun run e2e:test:ios` / `:android` |

Detox setup, mock layer, and run gotchas: see [../e2e/README.md](../e2e/README.md).

## Commands

```bash
bun run test                 # all Jest suites
bun run test --coverage      # + coverage gate (exit 1 if a threshold is missed)
bun run typecheck            # tsc --noEmit
bun run lint                 # eslint, 0 warnings
```

## Coverage thresholds (PRD §8) + explicit deviations

Configured in [`jest.config.js`](../jest.config.js). Jest enforces directory
globs **per-file**, so a glob's floor is bound by its weakest file.

| Group | PRD §8 target | Enforced floor | Status |
|-------|---------------|----------------|--------|
| `components/**` | lines/stmts 60 | 60 / 58 / 52 / 48 | **meets §8** — every component has a render test |
| `repositories/**` | lines 80 / branches 75 | 78 / 78 / 48 / 72 | aggregate ~92/78 **meets §8**; per-file floor lower (see below) |
| `viewmodels/**` | lines 85 / branches 80 | 58 / 55 / 27 / 58 | **below §8** (see below) — aggregate ~79 lines / 86 stmts |
| `screens/**` | lines 50 | excluded | **deviation** — covered by Detox E2E (see below) |
| global | lines/stmts 75 | 73 / 72 / 54 / 72 | aggregate ~78/83 |

**Why the deviations (explicit decision, per PM sign-off):**

- **ViewModels below §8 85/80.** The §8 numbers are an *aggregate* target; Jest
  enforces them *per-file*, so the floor is pinned to the weakest VM —
  `SendViewModel` (broadcast/sign path) and `WalletViewModel` (multi-chain
  portfolio path). Those branches are exercised by the **Detox send + dashboard
  E2E**, which Jest coverage cannot observe. VM *aggregate* is ~79% lines /
  86% statements. Raising the per-file floor to 85/80 would require unit-mocking
  the on-device signer + 8-chain RPC fan-out — duplicating what E2E already
  proves. Chosen: keep the meaningful per-file floor, rely on E2E for the rest.
- **`repositories/**` per-file floor < §8.** `faucet.repository.impl` error
  branches are covered by the **backend-driven faucet E2E**, not unit tests; the
  repo *aggregate* (~92% lines) comfortably meets §8.
- **`screens/**` excluded.** Screens are integration-rendered by the 5 Detox
  flows (onboard, send, faucet, webhook, RPC inspector). Unit-rendering every
  screen in Jest would re-test what E2E covers; PRD §8 itself annotates screens
  "// E2E covers rest".

Re-measure any time with `bun run test --coverage` (the per-directory table
prints actual %). When a weak VM gains real unit coverage, raise its glob floor.
