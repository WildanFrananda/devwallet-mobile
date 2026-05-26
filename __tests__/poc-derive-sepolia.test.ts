import SepoliaDerivationPoc from "../src/poc/derive-sepolia"

describe("Phase 1 PoC — Sepolia derivation", () => {
  it("derives Hardhat account #0 from BIP44 test mnemonic", () => {
    const account = SepoliaDerivationPoc.derive(SepoliaDerivationPoc.TEST_MNEMONIC, 0)
    expect(account.address.toLowerCase()).toBe(SepoliaDerivationPoc.EXPECTED_ADDRESS_0.toLowerCase())
    expect(account.path).toBe("m/44'/60'/0'/0/0")
    expect(account.privateKey.startsWith("0x")).toBe(true)
    expect(account.privateKey.length).toBe(66)
  })

  it("derives different addresses for different indices", () => {
    const a0 = SepoliaDerivationPoc.derive(SepoliaDerivationPoc.TEST_MNEMONIC, 0)
    const a1 = SepoliaDerivationPoc.derive(SepoliaDerivationPoc.TEST_MNEMONIC, 1)
    expect(a0.address).not.toBe(a1.address)
  })

  it("rejects invalid mnemonic", () => {
    expect(() => SepoliaDerivationPoc.derive("not a valid mnemonic phrase", 0)).toThrow("Invalid mnemonic")
  })

  it("run() reports passed=true with matching address", () => {
    const result = SepoliaDerivationPoc.run()
    expect(result.passed).toBe(true)
    expect(result.error).toBeUndefined()
    expect(result.derived.toLowerCase()).toBe(SepoliaDerivationPoc.EXPECTED_ADDRESS_0.toLowerCase())
  })
})
