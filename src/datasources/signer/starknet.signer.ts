import { Chain } from "../../core/constants/chains.enum"
import type SendDraft from "../../models/send-draft.model"
import Transaction from "../../models/transaction.model"
import type { ChainSigner, SendResult, SignerSecrets } from "./chain-signer.interface"

/**
 * StarkNet send requires a deployed account contract (Argent X / Braavos OZ)
 * + first-time deploy txn paid by the keypair. Phase 1 surfaces the raw
 * stark pubkey as the "address" but no on-chain account is deployed yet,
 * so signing is intentionally blocked here. Phase 2 plugs the account
 * deploy + transferStrk flow.
 */
class StarknetSigner implements ChainSigner {
  public supports(chain: Chain): boolean {
    return chain === Chain.STARKNET_SEPOLIA
  }

  public send(_secrets: SignerSecrets, _draft: SendDraft): Promise<SendResult> {
    return Promise.reject(
      new Error("StarkNet send not available — deploy an account contract first (Phase 2)")
    )
  }

  public waitForConfirmation(_chain: Chain, _hash: string): Promise<Transaction> {
    return Promise.reject(new Error("StarkNet confirmation not implemented yet"))
  }
}

export default StarknetSigner
