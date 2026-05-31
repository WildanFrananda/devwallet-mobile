# CLAUDE.md — devwallet-mobile

## Purpose

React Native app for DevWallet (multi-chain testnet wallet). All key derivation + signing happens on-device. Network calls hit the backend at `/api/v1/*` only for orchestration (faucet, webhooks, network config).

## Stack

- React Native 0.85.3 (Hermes + New Architecture / Fabric)
- Bun package manager
- TypeScript strict (extends `@react-native/typescript-config`)
- DI: `tsyringe` (decorators + tokens in `src/core/di/`)
- State + lifecycle: `react-native-mobile-mvvm` — `ViewModel` base class, `StateFlow<UiState<T>>`, hooks `useViewModel` / `useStream` / `useUiState` / `useEvent`
- Navigation: React Navigation 7 (`@react-navigation/native-stack`, `@react-navigation/bottom-tabs`)
- Storage: `react-native-keychain` (secret material) + `react-native-mmkv` (non-secret cache)
- Crypto: `@scure/bip32` + `@scure/bip39` + `tiny-secp256k1`
- Chain libs: `viem` (EVM), `@solana/web3.js`, `@cosmjs/*`, `bitcoinjs-lib`, `xrpl`, `starknet`

## Folder structure (flat layout)

Diverges from PRD §6.2. Single src/ flat tree:

```
src/
  core/             # di, network, crypto, storage, constants
  models/
  repositories/
  datasources/
  viewmodels/
  screens/
  components/
  navigation/
  hooks/
  theme/
  utils/
```

No `features/<name>/` nesting. Type-based flat layer-grouping — matches PRD §6.2. Files inside flat folders use feature-name prefix (`WalletViewModel.ts`, `FaucetViewModel.ts`). Promote to `features/` only when feature count > 15.

## Decisions

- **Chain scope (Phase 1):** 8 chains — Sepolia, Polygon Amoy, Base Sepolia (EVM); Bitcoin Testnet4; Solana Devnet; Cosmos Theta; XRPL Testnet; StarkNet Sepolia. Holesky dropped (Ethereum Foundation deprecated late 2025; Hoodi is the planned successor). Bitcoin Signet dropped (Testnet4 sufficient for MVP). Anvil local dropped (dev-only, not in MVP scope). Consider Hoodi as 2nd EVM testnet post-MVP.

## Known deviations

- **NetworkSelector uses RN `Modal`, not `@gorhom/bottom-sheet`.** PRD §5.1 calls for bottom-sheet UX, but Phase 1 keeps the RN Modal to ship on time. UX-level deviation, no functional impact. Revisit during Phase 2 polish.
- **Contract Terminal gas limit picker uses chip presets, not slider.** PRD §4.4 spec calls for a 21k→500k slider, but Phase 3 ships preset chips (21k / 50k / 100k / 200k / 500k) to avoid adding `@react-native-community/slider`. Revisit if user requests fine-grained control.

## Conventions

- Conventional Commits required (commitlint enforced)
- Clean MVVM: ViewModel calls Repository directly. **No use case layer.**
- ESLint flat config (`eslint.config.mjs`). Template-aligned: double quotes, no semi, 120 col, 2-space indent.
- DI bootstrap in `App.tsx` via `configureDI()` before any render.
- `import "reflect-metadata"` must be the first line of `App.tsx`.
- Private key NEVER leaves the device. All signing on-device, full stop.

## Related docs

- [docs/crypto-polyfill-decisions.md](docs/crypto-polyfill-decisions.md) — Phase 1 polyfill stack + load-order rules + lib swap rationale + issue log.

## Forbidden

- Do not introduce Redux / MobX / Zustand. Use `StateFlow` from `react-native-mobile-mvvm`.
- Do not add a use case layer.
- Do not call chain libs directly from screens — always through ViewModel → Repository → Datasource.
- Do not store any key material in MMKV / AsyncStorage. Keychain only.
- Do not install packages outside the PRD §7.1 tech stack matrix without asking.
- Do not import Express middleware or backend-only packages here.
