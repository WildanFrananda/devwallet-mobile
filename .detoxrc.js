/**
 * Detox configuration for DevWallet mobile E2E suite.
 *
 * Two device classes × two build types:
 *   - ios.sim.debug / ios.sim.release       (iPhone 15, iOS 17 simulator)
 *   - android.emu.debug / android.emu.release (Pixel 6, API 34 emulator)
 *
 * Per testing pyramid doc §Mobile Week 4 — CI runs the .release configs,
 * local iteration uses .debug. Before first run you must:
 *   1) bun add -d detox @types/detox jest-circus
 *   2) Patch iOS native (Podfile + AppDelegate.mm) and Android native
 *      (build.gradle + MainApplication.kt) per Detox docs.
 *   3) Build the app:  detox build --configuration ios.sim.debug
 *   4) Run the suite:  detox test --configuration ios.sim.debug
 */
/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: "jest",
      config: "e2e/jest.config.js"
    },
    jest: {
      setupTimeout: 120000
    }
  },
  // NOTE: all build commands bake in `.env.e2e` (ENVFILE) which sets
  // E2E_MOCK=1 → DIContainer swaps Faucet + Webhook repos for canned mocks
  // (see src/repositories/mock-*.repository.ts). Onboard + RPC Inspector specs
  // are unaffected (they don't touch those repos). The Send spec (real Sepolia
  // broadcast) needs a NON-mock build — rebuild without ENVFILE for that one.
  apps: {
    "ios.debug": {
      type: "ios.app",
      binaryPath: "ios/build/Build/Products/Debug-iphonesimulator/DevWallet.app",
      build:
        "ENVFILE=.env.e2e xcodebuild -workspace ios/DevWallet.xcworkspace -scheme DevWallet -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build"
    },
    "ios.release": {
      type: "ios.app",
      binaryPath: "ios/build/Build/Products/Release-iphonesimulator/DevWallet.app",
      build:
        "ENVFILE=.env.e2e xcodebuild -workspace ios/DevWallet.xcworkspace -scheme DevWallet -configuration Release -sdk iphonesimulator -derivedDataPath ios/build"
    },
    "android.debug": {
      type: "android.apk",
      binaryPath: "android/app/build/outputs/apk/debug/app-debug.apk",
      build:
        "cd android && ENVFILE=.env.e2e ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug && cd ..",
      reversePorts: [8081]
    },
    "android.release": {
      type: "android.apk",
      binaryPath: "android/app/build/outputs/apk/release/app-release.apk",
      build:
        "cd android && ENVFILE=.env.e2e ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release && cd .."
    }
  },
  devices: {
    simulator: {
      type: "ios.simulator",
      device: { type: "iPhone 17 Pro Max" }
    },
    emulator: {
      type: "android.emulator",
      device: { avdName: "Pixel_6a" }
    }
  },
  configurations: {
    "ios.sim.debug": { device: "simulator", app: "ios.debug" },
    "ios.sim.release": { device: "simulator", app: "ios.release" },
    "android.emu.debug": { device: "emulator", app: "android.debug" },
    "android.emu.release": { device: "emulator", app: "android.release" }
  }
}
