import { isAddress } from "viem"
import * as bitcoinjs from "bitcoinjs-lib"
import { PublicKey } from "@solana/web3.js"
import { isValidClassicAddress } from "xrpl"
import { bech32 } from "bech32"
import { Chain } from "../constants/chains.enum"

type ValidationResult = { valid: boolean; error?: string }

const VALID: ValidationResult = { valid: true }

/**
 * Pre-broadcast address validator — runs in the ViewModel so the Send
 * screen can disable the submit button + show an inline error instead of
 * waiting for the chain library to reject mid-broadcast.
 */
class AddressValidator {
  public static validate(chain: Chain, address: string): ValidationResult {
    const trimmed = address.trim()
    if (trimmed.length === 0) return { valid: false, error: "Address required" }

    switch (chain) {
      case Chain.EVM_SEPOLIA:
      case Chain.EVM_POLYGON_AMOY:
      case Chain.EVM_BASE_SEPOLIA:
        return AddressValidator.validateEvm(trimmed)
      case Chain.BITCOIN_TESTNET:
        return AddressValidator.validateBitcoin(trimmed)
      case Chain.SOLANA_DEVNET:
        return AddressValidator.validateSolana(trimmed)
      case Chain.COSMOS_THETA:
        return AddressValidator.validateCosmos(trimmed)
      case Chain.XRPL_TESTNET:
        return AddressValidator.validateXrpl(trimmed)
      case Chain.STARKNET_SEPOLIA:
        return AddressValidator.validateStarknet(trimmed)
    }
  }

  private static validateEvm(address: string): ValidationResult {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return { valid: false, error: "Must be 0x followed by 40 hex chars" }
    }
    if (!isAddress(address)) {
      return { valid: false, error: "Checksum failed (mixed-case addresses are case-sensitive)" }
    }
    return VALID
  }

  private static validateBitcoin(address: string): ValidationResult {
    try {
      bitcoinjs.address.toOutputScript(address, bitcoinjs.networks.testnet)
      return VALID
    } catch {
      return { valid: false, error: "Not a valid Bitcoin testnet address" }
    }
  }

  private static validateSolana(address: string): ValidationResult {
    try {
      const key = new PublicKey(address)
      return key.toBase58() === address ? VALID : { valid: false, error: "Invalid Solana address" }
    } catch {
      return { valid: false, error: "Not a valid Solana base58 address" }
    }
  }

  private static validateCosmos(address: string): ValidationResult {
    try {
      const decoded = bech32.decode(address)
      if (decoded.prefix !== "cosmos") {
        return { valid: false, error: `Expected 'cosmos' prefix, got '${decoded.prefix}'` }
      }
      return VALID
    } catch {
      return { valid: false, error: "Not a valid bech32 address" }
    }
  }

  private static validateXrpl(address: string): ValidationResult {
    if (!isValidClassicAddress(address)) {
      return { valid: false, error: "Not a valid XRPL classic address" }
    }
    return VALID
  }

  private static validateStarknet(address: string): ValidationResult {
    if (!/^0x[a-fA-F0-9]{62,66}$/.test(address)) {
      return { valid: false, error: "Must be 0x followed by 62-66 hex chars" }
    }
    return VALID
  }
}

export { AddressValidator, type ValidationResult }
