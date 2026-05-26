import { Injectable } from "react-native-mobile-mvvm/di"
import { Chain } from "../../core/constants/chains.enum"
import SendDraft from "../../models/send-draft.model"
import Transaction from "../../models/transaction.model"
import type { ChainSigner, SendResult, SignerSecrets } from "./chain-signer.interface"
import EvmSigner from "./evm.signer"
import SolanaSigner from "./solana.signer"
import BitcoinSigner from "./bitcoin.signer"
import CosmosSigner from "./cosmos.signer"
import XrplSigner from "./xrpl.signer"
import StarknetSigner from "./starknet.signer"

/**
 * Strategy dispatcher for tx signing + broadcast. Adds a chain = append
 * a new ChainSigner here.
 */
@Injectable()
class SignerDatasource {
  private readonly signers: ReadonlyArray<ChainSigner> = [
    new EvmSigner(),
    new SolanaSigner(),
    new BitcoinSigner(),
    new CosmosSigner(),
    new XrplSigner(),
    new StarknetSigner()
  ]

  public send(secrets: SignerSecrets, draft: SendDraft): Promise<SendResult> {
    const signer = this.signers.find(s => s.supports(draft.chain))
    if (!signer) {
      throw new Error(`No signer registered for ${draft.chain}`)
    }
    return signer.send(secrets, draft)
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
