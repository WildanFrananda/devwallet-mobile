import { Injectable } from "react-native-mobile-mvvm/di"
import { Chain } from "../../core/constants/chains.enum"
import SendDraft from "../../models/send-draft.model"
import Transaction from "../../models/transaction.model"
import type { ChainSigner, SendResult } from "./chain-signer.interface"
import EvmSigner from "./evm.signer"

/**
 * Strategy dispatcher for tx signing + broadcast. Phase 1 Day 16 covers
 * EVM; subsequent days add Solana, Bitcoin (PSBT), Cosmos, XRPL, StarkNet
 * by appending a new ChainSigner.
 */
@Injectable()
class SignerDatasource {
  private readonly signers: ReadonlyArray<ChainSigner> = [new EvmSigner()]

  public send(privateKey: string, draft: SendDraft): Promise<SendResult> {
    const signer = this.signers.find(s => s.supports(draft.chain))
    if (!signer) {
      throw new Error(`No signer registered for ${draft.chain}`)
    }
    return signer.send(privateKey, draft)
  }

  public waitForConfirmation(chain: Chain, hash: string): Promise<Transaction> {
    const signer = this.signers.find(s => s.supports(chain))
    if (!signer) {
      throw new Error(`No signer registered for ${chain}`)
    }
    return signer.waitForConfirmation(chain, hash)
  }
}

export default SignerDatasource
