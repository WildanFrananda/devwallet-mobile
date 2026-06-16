/// <reference types="detox" />
/**
 * E2E.2 — Send 0.001 ETH on Sepolia (REAL broadcast).
 *
 * This is the one flow that signs + broadcasts for real. It needs a dedicated
 * TESTNET wallet funded with a little Sepolia ETH, supplied OUT of source via
 * e2e/secrets.env (gitignored) — the mnemonic never enters the app binary or
 * the repo:
 *
 *   cp e2e/secrets.env.example e2e/secrets.env   # then fill E2E_SEND_MNEMONIC
 *
 * If E2E_SEND_MNEMONIC is unset the whole suite self-skips (so CI without the
 * secret stays green). Run it on the E2E build (the Faucet/Webhook mocks don't
 * touch the Send path) with Metro up:
 *
 *   bun run e2e:test:ios   e2e/send.spec.ts
 *   bun run e2e:test:android e2e/send.spec.ts
 *
 * Flow: restore funded wallet → Dashboard → Sepolia card → Tx history → Send →
 * fill recipient + 0.001 → Sign + send → assert a tx hash comes back.
 */
const SEND_MNEMONIC = process.env.E2E_SEND_MNEMONIC ?? ""
const SEND_TO = process.env.E2E_SEND_TO ?? "0x000000000000000000000000000000000000dEaD"
const PIN = "112233"

// Block the slow non-EVM testnet hosts so the Dashboard's background balance
// refresh can't stall Detox's network idle. The EVM RPCs (Alchemy when keyed,
// else publicnode) are NOT blocked, so the Sepolia balance + gas + broadcast
// all go through. mempool.space (Bitcoin) is the worst offender.
const BLOCK_NON_SEPOLIA = [
  "mempool\\.space",
  "api\\.devnet\\.solana\\.com",
  "polypore\\.xyz",
  "blastapi\\.io",
  "blockscout\\.com"
]

const maybe = SEND_MNEMONIC.trim().length > 0 ? describe : describe.skip

if (SEND_MNEMONIC.trim().length === 0) {
  // eslint-disable-next-line no-console
  console.warn(
    "[send.spec] skipped — set E2E_SEND_MNEMONIC in e2e/secrets.env to run the real-broadcast test"
  )
}

maybe("E2E.2 — Send Sepolia (real broadcast)", () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      delete: true,
      permissions: { notifications: "YES" }
    })
    await device.setURLBlacklist(BLOCK_NON_SEPOLIA)
    await restoreFromMnemonic()
  })

  it("broadcasts 0.001 ETH and returns a tx hash", async () => {
    // Dashboard → Sepolia balance card → Tx history → Send.
    await waitFor(element(by.id("balance-card.evm-sepolia")))
      .toExist()
      .withTimeout(60000)
    await element(by.id("balance-card.evm-sepolia")).tap()
    await element(by.id("tx-history.send")).tap()
    await waitFor(element(by.id("send-screen")))
      .toExist()
      .withTimeout(15000)

    await element(by.id("send.recipient")).typeText(SEND_TO)
    await element(by.id("send.amount")).typeText("0.001")
    // Dismiss the decimal-pad (tap the title) so the submit button is hittable.
    await element(by.id("send.title")).tap()
    await element(by.id("send.submit")).tap()

    // Real broadcast: success box carries the tx hash once accepted by the RPC.
    // (Status may read "Broadcast — pending" or "Confirmed"; both are a success.)
    await waitFor(element(by.id("send.success")))
      .toExist()
      .withTimeout(90000)
    await expect(element(by.id("send.tx-hash"))).toExist()
  })
})

async function restoreFromMnemonic(): Promise<void> {
  await element(by.id("welcome.restore-wallet")).tap()
  await element(by.id("restore.mnemonic-input")).typeText(SEND_MNEMONIC)
  await element(by.id("restore.continue")).tap()
  await element(by.id("pin-setup.input")).typeText(PIN)
  await element(by.id("pin-setup.continue")).tap()
  await element(by.id("pin-confirm.input")).typeText(PIN)
  await element(by.id("pin-confirm.continue")).tap()
  await waitFor(element(by.id("dashboard-screen")))
    .toExist()
    .withTimeout(60000)
}
