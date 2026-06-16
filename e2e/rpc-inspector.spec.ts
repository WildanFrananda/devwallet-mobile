/// <reference types="detox" />
/**
 * E2E.5 — RPC Inspector: real logs + replay.
 *
 * The Dashboard auto-loads balances on mount, firing per-chain RPC calls that
 * the logging transport records. The EVM RPCs (Alchemy) are allowed through so
 * those calls succeed and log; the slow non-EVM testnet hosts are blocked so
 * Detox's network idle never stalls. Then: open RPC Inspector → assert ≥5 logs
 * captured → expand one → replay it → assert the replay outcome banner.
 */
import { TEST_MNEMONIC, TEST_PIN } from "./fixtures/test-wallet"

// Block only the slow non-EVM testnet hosts; Alchemy EVM RPCs pass through so
// real Sepolia/Amoy/Base calls are made + logged.
const BLOCK_SLOW = [
  "mempool\\.space",
  "api\\.devnet\\.solana\\.com",
  "polypore\\.xyz",
  "blastapi\\.io",
  "blockscout\\.com"
]

describe("E2E.5 — RPC Inspector logs + replay", () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      delete: true,
      permissions: { notifications: "YES" }
    })
    await device.setURLBlacklist(BLOCK_SLOW)
    await restoreFromMnemonic()
  })

  it("captures ≥5 RPC logs and replays one", async () => {
    await element(by.id("nav.tab.tools")).tapAtPoint({ x: 30, y: 25 })
    await element(by.id("tools.rpc-inspector")).tap()
    await waitFor(element(by.id("rpc-inspector-screen")))
      .toExist()
      .withTimeout(15000)

    // The Dashboard's mount-time balance fetches log ≥5 RPC calls (8 chains).
    await waitFor(element(by.id("rpc-inspector.log-row.4")))
      .toExist()
      .withTimeout(30000)

    // Expand the first log → its detail (params/response) shows + Replay button.
    await element(by.id("rpc-inspector.log-row.0")).tap()
    await waitFor(element(by.id("rpc-log-detail.json")))
      .toExist()
      .withTimeout(10000)

    // Replay re-issues the call; the outcome banner appears (OK or error —
    // either proves the replay path ran end to end).
    await element(by.id("rpc-log-detail.replay")).tap()
    await waitFor(element(by.id("rpc-log-detail.replay-result")))
      .toExist()
      .withTimeout(20000)
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
