/// <reference types="detox" />
/**
 * E2E.1 — Onboarding fresh wallet.
 *
 * Real flow (matches src/navigation/OnboardingNavigator.tsx):
 *   GenerateWallet → tap "Generate" → mnemonic-display → tap "I've written it down"
 *   → VerifyMnemonic → dev-skip auto-fills + submits → PinSetup (create stage)
 *   → typeText PIN → tap Continue → PinSetup (confirm stage) → typeText PIN
 *   → tap Save PIN → Dashboard.
 *
 * Re-launch: app boots into Unlock screen → tap "Use PIN instead" → typeText PIN
 *   → tap Unlock → Dashboard.
 *
 * Spec assumes __DEV__ Debug build (dev-skip button visible). Release builds
 * must complete the real word-quiz manually — out of scope for E2E.
 */
import { TEST_PIN } from "./fixtures/test-wallet"

describe("E2E.1 — Onboarding fresh wallet", () => {
  beforeAll(async () => {
    // Dashboard mounts 8+ chain RPC fetches (mempool.space, 1rpc.io, etc.).
    // Detox's NetworkIdlingResource would otherwise stall every tap until
    // ALL of those resolve — and mempool.space testnet can hang for >60s.
    // We don't assert RPC results in this spec, only on testID visibility.
    await device.launchApp({
      newInstance: true,
      delete: true,
      permissions: { notifications: "YES" }
    })
    await device.setURLBlacklist([".*"])
  })

  it("generates a 12-word mnemonic and lands on the Dashboard after PIN setup", async () => {
    await expect(element(by.id("welcome-screen"))).toBeVisible()
    await element(by.id("welcome.create-wallet")).tap()

    await waitFor(element(by.id("mnemonic.continue")))
      .toBeVisible()
      .withTimeout(10000)
    await expect(element(by.id("mnemonic-display"))).toExist()
    await element(by.id("mnemonic.continue")).tap()

    await waitFor(element(by.id("verify-mnemonic.dev-skip")))
      .toBeVisible()
      .withTimeout(5000)
    await element(by.id("verify-mnemonic.dev-skip")).tap()

    await waitFor(element(by.id("pin-setup-screen")))
      .toBeVisible()
      .withTimeout(5000)
    await element(by.id("pin-setup.input")).typeText(TEST_PIN)
    await element(by.id("pin-setup.continue")).tap()

    await waitFor(element(by.id("pin-confirm-screen")))
      .toBeVisible()
      .withTimeout(5000)
    await element(by.id("pin-confirm.input")).typeText(TEST_PIN)
    await element(by.id("pin-confirm.continue")).tap()

    await waitFor(element(by.id("dashboard-screen")))
      .toExist()
      .withTimeout(60000)
  })

  it("re-launch lands on Unlock and accepts the saved PIN", async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: "YES" } })
    await device.setURLBlacklist([".*"])
    await waitFor(element(by.id("unlock-screen")))
      .toBeVisible()
      .withTimeout(10000)

    try {
      await element(by.id("unlock.use-pin")).tap()
    } catch {
      // Biometric disabled by default — PIN keypad already shown.
    }
    await element(by.id("unlock.pin-input")).typeText(TEST_PIN)
    await element(by.id("unlock.submit")).tap()
    await waitFor(element(by.id("dashboard-screen")))
      .toExist()
      .withTimeout(60000)
  })
})
