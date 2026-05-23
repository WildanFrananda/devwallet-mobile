# devwallet-mobile

React Native app for [DevWallet](https://github.com/WildanFrananda) — multi-chain testnet wallet. All key derivation + signing happens **on-device**. Backend is hit only for orchestration (faucet jobs, webhooks, network config).

## Stack

RN 0.85.3 (Hermes + Fabric) · Bun · TypeScript strict · `tsyringe` DI · `react-native-mobile-mvvm` (ViewModel + StateFlow) · React Navigation 7 · `react-native-keychain` + `react-native-mmkv` · viem · `@solana/web3.js` · `@cosmjs/*` · `bitcoinjs-lib` · `xrpl` · `starknet`

## Prerequisites

- macOS Sonoma 14+ (for iOS)
- Xcode 15+ · Cocoapods (`sudo gem install cocoapods`)
- Android Studio Hedgehog+ · JDK 17
- Bun 1.3+ · Node 22 LTS (for RN CLI)
- iOS Simulator + Android Emulator set up — see [RN env setup](https://reactnative.dev/docs/set-up-your-environment)

## Quick start

```bash
git clone https://github.com/WildanFrananda/devwallet-mobile.git
cd devwallet-mobile
cp .env.example .env
bun install
cd ios && pod install && cd ..
```

Run Metro + a platform:

```bash
bun run start                 # Metro bundler
# in another terminal:
bun run ios                   # iOS Simulator
# or:
bun run android               # Android Emulator
```

App boots into the Onboarding navigator (placeholder `Generate Wallet` screen). The screen demonstrates the MVVM wiring: `OnboardingViewModel` → `StateFlow<UiState<WalletDraft>>` → `useUiState`.

## Useful scripts

| Script | What it does |
|---|---|
| `bun run start` | Metro bundler |
| `bun run ios` | build + launch iOS Simulator |
| `bun run android` | build + launch Android Emulator |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | `eslint . --max-warnings=0` |
| `bun run lint:fix` | auto-fix lint |
| `bun run test` | Jest |

## Folder structure (flat)

```
src/
  core/                # di, network/{rpc,http}, crypto, storage, constants
  models/
  repositories/
  datasources/
  viewmodels/          # OnboardingViewModel.ts (reference)
  screens/             # GenerateWalletScreen.tsx (reference)
  components/
  navigation/          # RootNavigator + Onboarding/App/Tab
  hooks/
  theme/
  utils/
App.tsx                # configureDI() + NavigationContainer
```

Diverges from PRD §6.2 nested layout — see [CLAUDE.md](CLAUDE.md) for rationale + conventions.

## Architecture

- **MVVM via `react-native-mobile-mvvm`**: Subclass `ViewModel`, expose `StateFlow<UiState<T>>`, consume in screens with `useViewModel` + `useUiState`.
- **DI via `tsyringe`** (re-exported through `react-native-mobile-mvvm/di`): registrations in [src/core/di/container.ts](src/core/di/container.ts), tokens in [src/core/di/tokens.ts](src/core/di/tokens.ts).
- **No use case layer** — ViewModel calls Repository directly.
- **No Redux / MobX / Zustand** — `StateFlow` covers it.

## Troubleshooting

- **iOS build fails after install**: `cd ios && pod install && cd ..` and rebuild from Xcode.
- **Metro cache stale**: `bun run start --reset-cache`.
- **Android build fails on first run**: open `android/` in Android Studio to let Gradle sync, then retry.

## License

MIT — see [LICENSE](LICENSE)
