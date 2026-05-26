import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction as SolanaWeb3Transaction,
  sendAndConfirmTransaction
} from "@solana/web3.js"
import { Chain } from "../../core/constants/chains.enum"
import { NetworkRegistry } from "../../core/constants/networks"
import type SendDraft from "../../models/send-draft.model"
import Transaction from "../../models/transaction.model"
import type { ChainSigner, SendResult, SignerSecrets } from "./chain-signer.interface"

class SolanaSigner implements ChainSigner {
  public supports(chain: Chain): boolean {
    return chain === Chain.SOLANA_DEVNET
  }

  public async send(secrets: SignerSecrets, draft: SendDraft): Promise<SendResult> {
    const cfg = NetworkRegistry.get(draft.chain)
    const connection = new Connection(cfg.rpcUrl, "confirmed")

    const secret = SolanaSigner.hexToBytes(secrets.privateKey)
    const payer = Keypair.fromSecretKey(secret)
    const recipient = new PublicKey(draft.toAddress)

    const tx = new SolanaWeb3Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: recipient,
        lamports: draft.amount
      })
    )

    const hash = await sendAndConfirmTransaction(connection, tx, [payer])
    const rawTx = tx.serialize().toString("hex")

    return { hash, rawTx }
  }

  public async waitForConfirmation(chain: Chain, hash: string): Promise<Transaction> {
    const cfg = NetworkRegistry.get(chain)
    const connection = new Connection(cfg.rpcUrl, "confirmed")
    const parsed = await connection.getTransaction(hash, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed"
    })

    if (!parsed) {
      throw new Error(`Solana transaction ${hash} not found`)
    }

    const meta = parsed.meta
    const accountKeys = parsed.transaction.message.getAccountKeys()
    const fromKey = accountKeys.get(0)
    const toKey = accountKeys.get(1)

    return new Transaction({
      chain,
      hash,
      from: fromKey ? fromKey.toBase58() : "",
      to: toKey ? toKey.toBase58() : "",
      value: 0n,
      status: meta && meta.err === null ? "success" : "failed",
      blockNumber: parsed.slot,
      timestamp: parsed.blockTime ? new Date(parsed.blockTime * 1000) : null,
      gasUsed: null,
      fee: meta ? BigInt(meta.fee) : null
    })
  }

  private static hexToBytes(hex: string): Uint8Array {
    const clean = hex.startsWith("0x") ? hex.slice(2) : hex
    const out = new Uint8Array(clean.length / 2)
    for (let i = 0; i < out.length; i++) {
      out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
    }
    return out
  }
}

export default SolanaSigner
