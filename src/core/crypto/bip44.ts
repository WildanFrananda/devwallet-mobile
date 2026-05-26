import { Chain } from "../constants/chains.enum"

type Purpose = 44 | 49 | 84 | 86

/**
 * SLIP-0044 registered coin types. EVM chains share 60 (Ethereum-compatible).
 * Bitcoin testnet uses 1.
 * https://github.com/satoshilabs/slips/blob/master/slip-0044.md
 *
 * Purpose values:
 *   44 = BIP44 legacy (default for EVM, Cosmos, XRPL)
 *   84 = BIP84 native segwit (Bitcoin tb1q...)
 *
 * Solana paths use SLIP-0010 Ed25519 derivation (hardened-only); the path
 * is still encoded as `m/44'/501'/account'/change'` but the resolver is
 * different (see ed25519-hd-key).
 */
class Bip44Paths {
  private static readonly coinTypes: Record<Chain, number> = {
    [Chain.EVM_SEPOLIA]: 60,
    [Chain.EVM_HOLESKY]: 60,
    [Chain.EVM_POLYGON_AMOY]: 60,
    [Chain.EVM_BASE_SEPOLIA]: 60,
    [Chain.EVM_LOCAL]: 60,
    [Chain.BITCOIN_TESTNET]: 1,
    [Chain.SOLANA_DEVNET]: 501,
    [Chain.COSMOS_THETA]: 118,
    [Chain.XRPL_TESTNET]: 144,
    [Chain.STARKNET_SEPOLIA]: 9004
  }

  private static readonly purposes: Partial<Record<Chain, Purpose>> = {
    [Chain.BITCOIN_TESTNET]: 84
  }

  public static coinType(chain: Chain): number {
    return Bip44Paths.coinTypes[chain]
  }

  public static purpose(chain: Chain): Purpose {
    return Bip44Paths.purposes[chain] ?? 44
  }

  public static path(chain: Chain, addressIndex: number = 0, account: number = 0, change: 0 | 1 = 0): string {
    const purpose = Bip44Paths.purpose(chain)
    const coinType = Bip44Paths.coinType(chain)
    return `m/${purpose}'/${coinType}'/${account}'/${change}/${addressIndex}`
  }

  /**
   * SLIP-0010 hardened-only path for Ed25519 chains (Solana). Index + change
   * positions get hardened too because Ed25519 has no public-key derivation.
   */
  public static hardenedPath(chain: Chain, addressIndex: number = 0, account: number = 0): string {
    const coinType = Bip44Paths.coinType(chain)
    return `m/44'/${coinType}'/${account}'/${addressIndex}'`
  }
}

export default Bip44Paths
export { type Purpose }
