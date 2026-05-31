import { Client, Wallet, type Payment } from "xrpl"
import { Chain } from "../../core/constants/chains.enum"
import { NetworkRegistry } from "../../core/constants/networks"
import Bip44Paths from "../../core/crypto/bip44"
import { callAndLog } from "../../core/network/logging-transport"
import type SendDraft from "../../models/send-draft.model"
import Transaction from "../../models/transaction.model"
import type { ChainSigner, SendResult, SignerSecrets } from "./chain-signer.interface"

class XrplSigner implements ChainSigner {
  public supports(chain: Chain): boolean {
    return chain === Chain.XRPL_TESTNET
  }

  public async send(secrets: SignerSecrets, draft: SendDraft): Promise<SendResult> {
    const cfg = NetworkRegistry.get(draft.chain)
    const path = Bip44Paths.path(Chain.XRPL_TESTNET, 0)
    const wallet = Wallet.fromMnemonic(secrets.mnemonic, {
      derivationPath: path,
      mnemonicEncoding: "bip39"
    })

    const client = new Client(cfg.rpcUrl)
    try {
      await callAndLog({
        chain: draft.chain,
        endpoint: cfg.rpcUrl,
        method: "xrpl.Client.connect",
        params: {},
        run: () => client.connect()
      })
      const payment: Payment = {
        TransactionType: "Payment",
        Account: wallet.classicAddress,
        Destination: draft.toAddress,
        Amount: draft.amount.toString()
      }
      const prepared = await callAndLog({
        chain: draft.chain,
        endpoint: cfg.rpcUrl,
        method: "autofill",
        params: { tx: payment },
        run: () => client.autofill(payment)
      })
      const signed = wallet.sign(prepared)
      const submitResult = await callAndLog({
        chain: draft.chain,
        endpoint: cfg.rpcUrl,
        method: "submitAndWait",
        params: {},
        run: () => client.submitAndWait(signed.tx_blob)
      })
      const result = submitResult.result
      return { hash: result.hash, rawTx: signed.tx_blob }
    } finally {
      await client.disconnect()
    }
  }

  public async waitForConfirmation(chain: Chain, hash: string): Promise<Transaction> {
    const cfg = NetworkRegistry.get(chain)
    const client = new Client(cfg.rpcUrl)
    try {
      await callAndLog({
        chain,
        endpoint: cfg.rpcUrl,
        method: "xrpl.Client.connect",
        params: {},
        run: () => client.connect()
      })
      const lookup = await callAndLog({
        chain,
        endpoint: cfg.rpcUrl,
        method: "request(tx)",
        params: { hash },
        run: () => client.request({ command: "tx", transaction: hash })
      })
      const tx = lookup.result
      const validated = tx.validated === true
      return new Transaction({
        chain,
        hash,
        from: "",
        to: "",
        value: 0n,
        status: validated ? "success" : "pending",
        blockNumber: typeof tx.ledger_index === "number" ? tx.ledger_index : null,
        timestamp: null,
        gasUsed: null,
        fee: null
      })
    } finally {
      await client.disconnect()
    }
  }
}

export default XrplSigner
