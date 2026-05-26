import type { HDKey } from "@scure/bip32"
import type { Chain } from "../../constants/chains.enum"
import type Account from "../../../models/account.model"

/**
 * Inputs every per-chain deriver may consume. Different chains use different
 * subsets — EVM/Bitcoin/StarkNet take the BIP32 root; Solana needs the raw
 * BIP39 seed (Ed25519 SLIP-0010); Cosmos/XRPL re-derive from the mnemonic
 * because their libs accept it directly.
 */
type DerivationContext = {
  readonly root: HDKey
  readonly seed: Uint8Array
  readonly mnemonic: string
}

/**
 * Strategy contract. KeyringService keeps a list of `ChainDeriver`s and
 * dispatches by `supports(chain)`. Add a new chain by writing a new
 * class — no KeyringService change required (open/closed).
 */
interface ChainDeriver {
  supports(chain: Chain): boolean
  derive(ctx: DerivationContext, chain: Chain, addressIndex: number): Promise<Account>
}

export type { ChainDeriver, DerivationContext }
