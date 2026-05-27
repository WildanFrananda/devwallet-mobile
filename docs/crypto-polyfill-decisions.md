# Crypto polyfill decisions — Phase 1 retrospective

DevWallet runs in React Native (Hermes + New Architecture). RN ships no
Node built-ins (`crypto`, `Buffer`, `TextEncoder`), so every chain library
that assumes a browser/Node global has to be backfilled. This doc captures
the final stack and the load-order rules we found by trial.

## 1. Polyfill stack (final)

| Lib | Version | Purpose |
|-----|---------|---------|
| `react-native-get-random-values` | ^1.11 | `crypto.getRandomValues()` shim — required by every BIP39/BIP32 path |
| `text-encoding-polyfill` | ^0.6 | `TextEncoder`/`TextDecoder` for `xrpl`, `bitcoinjs-lib`, `@cosmjs/*` |
| `buffer` | ^6.0 | `Buffer` global — `bitcoinjs-lib`, `@scure/bip32`, `xrpl` all assume it |
| `react-native-quick-crypto` | ^0.8 | Native `node:crypto` shim (HMAC, SHA, PBKDF2) — Solana `@solana/web3.js` + `@cosmjs/crypto` need it |
| `reflect-metadata` | ^0.2 | `tsyringe` decorator metadata at runtime |

`react-native-mobile-mvvm/di` re-exports tsyringe — no separate import needed.

## 2. `index.js` load order (strict)

ES `import` is hoisted, so the original `import "react-native-get-random-values"` happened **after** chain libs had already required `crypto`. The fix is to convert the entrypoint to CommonJS `require()` so order is literal top-to-bottom.

```js
// index.js — order matters, do NOT reformat to ES imports
require("react-native-get-random-values")  // 1. crypto.getRandomValues first
require("text-encoding-polyfill")          // 2. TextEncoder/Decoder
const { Buffer } = require("buffer")
globalThis.Buffer = globalThis.Buffer ?? Buffer  // 3. Buffer global
const { install } = require("react-native-quick-crypto")
install()                                  // 4. node:crypto shim
require("reflect-metadata")                // 5. tsyringe metadata
const { AppRegistry } = require("react-native")
const App = require("./App").default
const { name: appName } = require("./app.json")
AppRegistry.registerComponent(appName, () => App)
```

Why this order:
- `getRandomValues` is a prerequisite for `Buffer` filling, RNQC self-test, and BIP39.
- `Buffer` must be a global **before** any module that does `Buffer.from(...)` at module scope (bitcoinjs).
- `reflect-metadata` must be loaded before any class with decorators is evaluated, which means before `App.tsx`.

`App.tsx` must NOT re-import `reflect-metadata` — the require in `index.js` is the single source of truth.

## 3. Lib swap decisions

| From | To | Reason |
|------|----|--------|
| `tiny-secp256k1` | `@bitcoinerlab/secp256k1` | `tiny-secp256k1` ships a WASM binary that fails to load under Hermes. `@bitcoinerlab` is pure JS, slightly slower but works in RN. We wire it once via `bitcoinjs-lib.initEccLib()`. |
| `crypto-js` (initial guess) | `react-native-quick-crypto` | `crypto-js` is pure JS and ~10× slower for PBKDF2 / SHA-256. RNQC uses native iOS/Android primitives. |
| `node-fetch` shim | (none) | RN ships `fetch` already. Any lib that imports `node-fetch` we treat as a bug — confirmed all current chain libs use the global `fetch`. |
| `rpc-websockets` (default ESM) | `rpc-websockets/dist/index.browser.cjs` | `@solana/web3.js` subclasses `RpcWebSocketClient` at import time. Default export is ESM that Metro chokes on; the browser CJS build resolves cleanly. Wired via `metro.config.js` resolver shim. |

## 4. Issues hit + workaround log

- **`Property 'TextDecoder' doesn't exist`** — xrpl loaded before `text-encoding-polyfill`. Fixed by moving polyfill into `index.js` (CommonJS order).
- **`Property 'Buffer' doesn't exist`** — `App.tsx`'s ES imports transitively required `bitcoinjs-lib` before `globalThis.Buffer = Buffer` ran. Fixed by `require()` order in `index.js`.
- **`Super expression must either be null or a function` (rpc-websockets)** — caused by an earlier empty-stub shim. Replaced with the browser CJS build in `metro.config.js`.
- **`@noble/hashes/crypto.js` cannot be resolved** — Metro resolver was appending `.js`. Added a resolver entry that strips `.js` for the `@noble/hashes/crypto` import.
- **tsyringe `@Inject(Tokens.AutoLock)` resolved to `undefined`** — Babel does not honor `tsconfig.emitDecoratorMetadata`. Fixed by adding `babel-plugin-transform-typescript-metadata` **before** `@babel/plugin-proposal-decorators` in `babel.config.js`.
- **`NitroModulesSpec/NitroModulesSpec.h' file not found`** (iOS build) — stale DerivedData + Pods. Wrote `scripts/nuke-ios.sh` to wipe and reinstall.
- **`react-native-mmkv` `MMKV is not a constructor`** — v4 dropped the class export. Use `createMMKV({ id })` factory.
- **iOS Keychain survives `xcrun simctl uninstall`** — reinstalling found the prior mnemonic and skipped onboarding. Added `core/storage/install-marker.ts` (MMKV-backed) to detect fresh install and `keychain.clear()` before reading.

## 5. Adding a new chain — checklist

1. Add enum entry in `src/core/constants/chains.enum.ts`.
2. Add `NetworkRegistry` entry in `src/core/constants/networks.ts`.
3. Add SLIP-0044 coin type in `src/core/crypto/bip44.ts` (purpose only if non-standard).
4. Implement `ChainDeriver` and register in `KeyringService.derivers`.
5. Implement `ChainBalanceFetcher`, register in `BalanceDatasource`.
6. (Optional) Implement `ChainTokenFetcher`, `ChainTxHistoryFetcher`, `ChainSigner`.
7. Update snapshot test fixture (`__tests__/__snapshots__/keyring-snapshot.test.ts.snap`) — regenerate with `bun run test -u`, verify diff.

Confirm chain libs don't reach for Node built-ins outside this polyfill set — if they do, log in this doc and add the shim.
