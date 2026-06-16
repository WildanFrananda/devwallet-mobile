/**
 * Dedicated E2E test wallet — funded once manually with testnet drips.
 *
 * SECURITY: This mnemonic protects testnet-only funds. Never reuse for
 * mainnet. Never commit a mainnet seed. The address constants below are
 * derived offline from this mnemonic at path m/44'/60'/0'/0/0 (EVM) and
 * MUST stay in sync with the seed; regenerate via `bun run scripts/derive-test-addresses.ts`
 * if you ever rotate the seed.
 */

export const TEST_MNEMONIC =
  "test test test test test test test test test test test junk"

export const TEST_ADDRESSES = {
  evmSepolia: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  evmPolygonAmoy: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  evmBaseSepolia: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
}

export const TEST_PIN = "112233"

export const SAMPLE_RECIPIENT = "0x0000000000000000000000000000000000000001"

export const SAMPLE_CONTRACT = {
  // Sepolia LINK token — well-known, stable across resets.
  address: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
  eventSignature: "Transfer(address,address,uint256)"
}
