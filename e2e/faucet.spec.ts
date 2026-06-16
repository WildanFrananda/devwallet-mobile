/// <reference types="detox" />
/**
 * E2E.3 — Request all faucets (mock-backed).
 *
 * Requires the E2E build (`.env.e2e` → E2E_MOCK=1) so the Faucet repo is the
 * canned MockFaucetRepository: `requestAll` enqueues every chain, then a
 * `faucet.success` event per chain flips each row to completed with amount
 * 0.05. No backend / WebSocket involved.
 *
 * Asserts the three EVM rows reach the completed badge + show an amount.
 */
import { TEST_MNEMONIC, TEST_PIN } from "./fixtures/test-wallet"

describe("E2E.3 — Request all faucets", () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      delete: true,
      permissions: { notifications: "YES" }
    })
    await device.setURLBlacklist([".*"])
    await restoreFromMnemonic()
  })

  it("flips the three EVM rows to completed with an amount", async () => {
    await element(by.id("nav.tab.faucet")).tapAtPoint({ x: 30, y: 25 })
    await waitFor(element(by.id("faucet-screen")))
      .toExist()
      .withTimeout(15000)
    // Row containers are always rendered; wait for one to confirm addresses
    // derived + list painted before tapping Request all.
    await waitFor(element(by.id("faucet.row.sepolia")))
      .toExist()
      .withTimeout(15000)

    await element(by.id("faucet.request-all")).tap()

    for (const slug of ["sepolia", "polygon-amoy", "base-sepolia"]) {
      await waitFor(element(by.id(`faucet.row.${slug}.status-completed`)))
        .toExist()
        .withTimeout(15000)
      await expect(element(by.id(`faucet.row.${slug}.amount`))).toExist()
    }
  })
})

async function restoreFromMnemonic(): Promise<void> {
  await element(by.id("welcome.restore-wallet")).tap()
  await element(by.id("restore.mnemonic-input")).typeText(TEST_MNEMONIC)
  await element(by.id("restore.continue")).tap()
  await element(by.id("pin-setup.input")).typeText(TEST_PIN)
  await element(by.id("pin-setup.continue")).tap()
  await element(by.id("pin-confirm.input")).typeText(TEST_PIN)
  await element(by.id("pin-confirm.continue")).tap()
  await waitFor(element(by.id("dashboard-screen")))
    .toExist()
    .withTimeout(60000)
}
