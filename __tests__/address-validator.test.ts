import { AddressValidator } from "../src/core/crypto/validators"
import { Chain } from "../src/core/constants/chains.enum"

describe("AddressValidator", () => {
  describe("EVM", () => {
    it("accepts valid checksummed address", () => {
      const result = AddressValidator.validate(
        Chain.EVM_SEPOLIA,
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
      )
      expect(result.valid).toBe(true)
    })

    it("rejects too-short hex", () => {
      const result = AddressValidator.validate(Chain.EVM_SEPOLIA, "0x123")
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/40 hex/)
    })

    it("rejects empty string", () => {
      const result = AddressValidator.validate(Chain.EVM_SEPOLIA, "")
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/required/)
    })

    it("rejects wrong checksum mixed-case", () => {
      // Same address with wrong case
      const result = AddressValidator.validate(
        Chain.EVM_SEPOLIA,
        "0x70997970c51812Dc3A010C7d01b50e0d17dc79c8"
      )
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/Checksum/)
    })
  })

  describe("Bitcoin", () => {
    it("accepts valid tb1 testnet address", () => {
      const result = AddressValidator.validate(
        Chain.BITCOIN_TESTNET,
        "tb1qquv9lg5g2r4jkr0ahun0ddfg5xntxjelvmc7t8"
      )
      expect(result.valid).toBe(true)
    })

    it("rejects mainnet bc1 prefix on testnet", () => {
      const result = AddressValidator.validate(
        Chain.BITCOIN_TESTNET,
        "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq"
      )
      expect(result.valid).toBe(false)
    })
  })

  describe("Cosmos", () => {
    it("accepts cosmos1 bech32", () => {
      const result = AddressValidator.validate(
        Chain.COSMOS_THETA,
        "cosmos15yk64u7zc9g9k2yr2wmzeva5qgwxps6yxj00e7"
      )
      expect(result.valid).toBe(true)
    })

    it("rejects wrong prefix", () => {
      const result = AddressValidator.validate(
        Chain.COSMOS_THETA,
        "osmo15yk64u7zc9g9k2yr2wmzeva5qgwxps6y4r3pkt"
      )
      expect(result.valid).toBe(false)
    })
  })

  describe("XRPL", () => {
    it("accepts valid classic address", () => {
      const result = AddressValidator.validate(
        Chain.XRPL_TESTNET,
        "rDsbeomae4FXwgQTJp9Rs64Qg9vDiTCdBv"
      )
      expect(result.valid).toBe(true)
    })

    it("rejects malformed", () => {
      const result = AddressValidator.validate(Chain.XRPL_TESTNET, "rINVALID")
      expect(result.valid).toBe(false)
    })
  })

  describe("Starknet", () => {
    it("accepts 0x hex 64 chars", () => {
      const result = AddressValidator.validate(
        Chain.STARKNET_SEPOLIA,
        "0x0407f0ecd1ec6159e6a7c70084aaa7d693d9113149b80ab72618602a185e2c1f"
      )
      expect(result.valid).toBe(true)
    })

    it("rejects too-short", () => {
      const result = AddressValidator.validate(Chain.STARKNET_SEPOLIA, "0x123")
      expect(result.valid).toBe(false)
    })
  })
})
