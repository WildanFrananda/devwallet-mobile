/// <reference types="detox" />
/**
 * E2E.4 — Create webhook + see its log (mock-backed).
 *
 * Requires the E2E build (`.env.e2e` → E2E_MOCK=1) so the Webhook repo is the
 * canned MockWebhookRepository: `create` stores an in-memory webhook and
 * `logs` returns one canned entry. Flow follows the real navigation:
 *   Tools → Webhooks → Add → fill form → Create → success → Back to list →
 *   tap the new row → Detail → log row appears.
 */
import { TEST_MNEMONIC, TEST_PIN, SAMPLE_CONTRACT } from "./fixtures/test-wallet"

describe("E2E.4 — Create webhook + receive log", () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      delete: true,
      permissions: { notifications: "YES" }
    })
    await device.setURLBlacklist([".*"])
    await restoreFromMnemonic()
  })

  it("creates a webhook (default Sepolia) and renders its log on Detail", async () => {
    await element(by.id("nav.tab.tools")).tapAtPoint({ x: 30, y: 25 })
    await element(by.id("tools.webhooks")).tap()
    await waitFor(element(by.id("webhook-list-screen")))
      .toExist()
      .withTimeout(15000)

    await element(by.id("webhook-list.add")).tap()
    await waitFor(element(by.id("webhook-create-screen")))
      .toExist()
      .withTimeout(15000)

    // Default chain is evm:sepolia — no selection needed.
    await element(by.id("webhook-create.contract")).typeText(SAMPLE_CONTRACT.address)
    await element(by.id("webhook-create.event-signature")).typeText(SAMPLE_CONTRACT.eventSignature)
    // Dismiss the keyboard (tap the already-selected chain chip) so the submit
    // button isn't behind it — a tap landing on the keyboard is a silent no-op.
    await element(by.id("webhook-create.chain.evm:sepolia")).tap()
    await element(by.id("webhook-create.submit")).tap()

    // Success box lives at the bottom of a ScrollView, under the keyboard —
    // assert it exists (in tree) rather than fully visible. The header Back
    // button is always reachable to return to the list.
    await waitFor(element(by.id("webhook-create.success")))
      .toExist()
      .withTimeout(15000)
    await element(by.id("webhook-create.back")).tap()

    await waitFor(element(by.id("webhook-list.row.0")))
      .toExist()
      .withTimeout(15000)
    await element(by.id("webhook-list.row.0")).tap()

    await waitFor(element(by.id("webhook-detail-screen")))
      .toExist()
      .withTimeout(15000)
    // The mock returns NO logs on Detail mount and only fires the contract event
    // ~0.8s later. So the log row can appear ONLY if the live-event subscription
    // ran refreshLogs — a broken subscription would leave the screen empty
    // forever and time this out. This genuinely exercises the event-driven path,
    // not the initial bind. (An empty-state pre-assertion was dropped: the
    // empty→log window is too short to observe without flake.)
    await waitFor(element(by.id("webhook-detail.log-row.0")))
      .toExist()
      .withTimeout(15000)
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
