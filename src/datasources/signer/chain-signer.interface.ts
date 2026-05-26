import type { Chain } from "../../core/constants/chains.enum"
import type SendDraft from "../../models/send-draft.model"
import type Transaction from "../../models/transaction.model"

type SignerSecrets = {
  privateKey: string
  mnemonic: string
}

type SendResult = {
  hash: string
  rawTx: string
}

interface ChainSigner {
  supports(chain: Chain): boolean
  send(secrets: SignerSecrets, draft: SendDraft): Promise<SendResult>
  waitForConfirmation(chain: Chain, hash: string): Promise<Transaction>
}

export type { ChainSigner, SendResult, SignerSecrets }
