import KeyringService from "../src/core/crypto/keyring/keyring.service"

const TEST_MNEMONIC = "test test test test test test test test test test test junk"

/**
 * Phase 1 Day 5 lock-in: 1 mnemonic → all 8 supported chain addresses.
 * Holesky dropped (Ethereum Foundation deprecated 2025); Anvil local
 * dropped (dev-only, not part of MVP scope). Any future derivation change
 * (different lib version, path, curve params) will break this snapshot —
 * by design. Verify the diff is intentional before regenerating with
 * `bun run test -u`.
 */
describe("KeyringService snapshot", () => {
  it("derives a stable address set from the BIP44 test mnemonic", async () => {
    const svc = new KeyringService()
    svc.loadMnemonic(TEST_MNEMONIC)
    const accounts = await svc.deriveSupportedAll(0)

    const fixture = accounts.map(a => ({
      chain: a.chain,
      path: a.path,
      address: a.address
    }))

    expect(fixture).toMatchSnapshot()
  })

  it("address set is stable across repeated calls", async () => {
    const svc = new KeyringService()
    svc.loadMnemonic(TEST_MNEMONIC)
    const a = await svc.deriveSupportedAll(0)
    const b = await svc.deriveSupportedAll(0)
    expect(a.map(x => x.address)).toEqual(b.map(x => x.address))
  })
})
