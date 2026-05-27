import FeeDatasource from "../src/datasources/fee/fee.datasource"
import { Chain } from "../src/core/constants/chains.enum"

jest.mock("../src/datasources/fee/evm.fee-estimator", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    supports: (c: string) => c.startsWith("evm:"),
    estimateNativeFee: jest.fn().mockResolvedValue(123n)
  }))
}))
jest.mock("../src/datasources/fee/bitcoin.fee-estimator", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    supports: (c: string) => c === "bitcoin:testnet",
    estimateNativeFee: jest.fn().mockResolvedValue(2000n)
  }))
}))
jest.mock("../src/datasources/fee/solana.fee-estimator", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    supports: (c: string) => c === "solana:devnet",
    estimateNativeFee: jest.fn().mockResolvedValue(5000n)
  }))
}))
jest.mock("../src/datasources/fee/cosmos.fee-estimator", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    supports: (c: string) => c === "cosmos:theta-testnet",
    estimateNativeFee: jest.fn().mockResolvedValue(5000n)
  }))
}))
jest.mock("../src/datasources/fee/xrpl.fee-estimator", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    supports: (c: string) => c === "xrpl:testnet",
    estimateNativeFee: jest.fn().mockResolvedValue(10n)
  }))
}))
jest.mock("../src/datasources/fee/starknet.fee-estimator", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    supports: (c: string) => c === "starknet:sepolia",
    estimateNativeFee: jest.fn().mockResolvedValue(0n)
  }))
}))

describe("FeeDatasource", () => {
  const ds = new FeeDatasource()

  it("picks EVM estimator", async () => {
    expect(await ds.estimateNativeFee(Chain.EVM_SEPOLIA)).toBe(123n)
    expect(await ds.estimateNativeFee(Chain.EVM_POLYGON_AMOY)).toBe(123n)
  })
  it("picks Bitcoin estimator", async () => {
    expect(await ds.estimateNativeFee(Chain.BITCOIN_TESTNET)).toBe(2000n)
  })
  it("picks Solana estimator", async () => {
    expect(await ds.estimateNativeFee(Chain.SOLANA_DEVNET)).toBe(5000n)
  })
  it("picks Cosmos estimator", async () => {
    expect(await ds.estimateNativeFee(Chain.COSMOS_THETA)).toBe(5000n)
  })
  it("picks XRPL estimator", async () => {
    expect(await ds.estimateNativeFee(Chain.XRPL_TESTNET)).toBe(10n)
  })
  it("picks Starknet estimator (returns 0)", async () => {
    expect(await ds.estimateNativeFee(Chain.STARKNET_SEPOLIA)).toBe(0n)
  })
})
