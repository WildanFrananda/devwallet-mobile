import * as bitcoin from "bitcoinjs-lib"
import ECPairFactory from "ecpair"
import ecc from "@bitcoinerlab/secp256k1"
import { Buffer } from "buffer"
import { Chain } from "../../core/constants/chains.enum"
import { NetworkRegistry } from "../../core/constants/networks"
import type SendDraft from "../../models/send-draft.model"
import Transaction from "../../models/transaction.model"
import type { ChainSigner, SendResult, SignerSecrets } from "./chain-signer.interface"

const ECPair = ECPairFactory(ecc)
let eccReady = false

type Utxo = {
  txid: string
  vout: number
  value: number
  status: { confirmed: boolean; block_height?: number; block_time?: number }
}

const DUST_LIMIT = 546n
const SEGWIT_FEE_RATE_SATS_PER_VB = 2n // testnet conservative
const ESTIMATED_TX_VBYTES = 140n

class BitcoinSigner implements ChainSigner {
  public supports(chain: Chain): boolean {
    return chain === Chain.BITCOIN_TESTNET
  }

  public async send(secrets: SignerSecrets, draft: SendDraft): Promise<SendResult> {
    BitcoinSigner.ensureEcc()

    const cfg = NetworkRegistry.get(draft.chain)
    const network = bitcoin.networks.testnet

    const keyBytes = BitcoinSigner.hexToBytes(secrets.privateKey)
    const keyPair = ECPair.fromPrivateKey(keyBytes, { network })
    const pubkey = Buffer.from(keyPair.publicKey)
    const { address: senderAddress } = bitcoin.payments.p2wpkh({ pubkey, network })
    if (!senderAddress) {
      throw new Error("Could not derive sender p2wpkh address")
    }

    const utxos = await BitcoinSigner.fetchUtxos(cfg.rpcUrl, senderAddress)
    if (utxos.length === 0) {
      throw new Error("No UTXOs available")
    }

    const fee = SEGWIT_FEE_RATE_SATS_PER_VB * ESTIMATED_TX_VBYTES
    const target = draft.amount + fee

    const { selected, total } = BitcoinSigner.selectUtxos(utxos, target)
    if (total < target) {
      throw new Error(`Insufficient funds: have ${total}, need ${target}`)
    }

    const psbt = new bitcoin.Psbt({ network })
    const script = bitcoin.address.toOutputScript(senderAddress, network)

    for (const utxo of selected) {
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: { script, value: BigInt(utxo.value) }
      })
    }

    psbt.addOutput({ address: draft.toAddress, value: draft.amount })

    const change = total - target
    if (change >= DUST_LIMIT) {
      psbt.addOutput({ address: senderAddress, value: change })
    }

    const signer = {
      publicKey: pubkey,
      sign: (hash: Buffer): Buffer => Buffer.from(keyPair.sign(hash))
    }

    psbt.signAllInputs(signer)
    psbt.finalizeAllInputs()

    const rawTx = psbt.extractTransaction().toHex()
    const hash = await BitcoinSigner.broadcastTx(cfg.rpcUrl, rawTx)

    return { hash, rawTx }
  }

  public async waitForConfirmation(chain: Chain, hash: string): Promise<Transaction> {
    const cfg = NetworkRegistry.get(chain)

    // Poll status until confirmed or timeout (~5 min)
    let confirmed = false
    let blockHeight: number | null = null
    let blockTime: number | null = null
    for (let i = 0; i < 30; i++) {
      const res = await fetch(`${cfg.rpcUrl}/tx/${hash}/status`)
      if (res.ok) {
        const status = (await res.json()) as {
          confirmed: boolean
          block_height?: number
          block_time?: number
        }
        if (status.confirmed) {
          confirmed = true
          blockHeight = status.block_height ?? null
          blockTime = status.block_time ?? null
          break
        }
      }
      await new Promise<void>(resolve => setTimeout(() => resolve(), 10_000))
    }

    return new Transaction({
      chain,
      hash,
      from: "",
      to: "",
      value: 0n,
      status: confirmed ? "success" : "pending",
      blockNumber: blockHeight,
      timestamp: blockTime !== null ? new Date(blockTime * 1000) : null,
      gasUsed: null,
      fee: null
    })
  }

  private static ensureEcc(): void {
    if (eccReady) return
    bitcoin.initEccLib(ecc)
    eccReady = true
  }

  private static async fetchUtxos(base: string, address: string): Promise<Utxo[]> {
    const res = await fetch(`${base}/address/${address}/utxo`)
    if (!res.ok) {
      throw new Error(`Blockstream utxo ${res.status}`)
    }
    return (await res.json()) as Utxo[]
  }

  private static selectUtxos(utxos: ReadonlyArray<Utxo>, target: bigint): { selected: Utxo[]; total: bigint } {
    const sorted = [...utxos].sort((a, b) => b.value - a.value)
    const selected: Utxo[] = []
    let total = 0n
    for (const u of sorted) {
      selected.push(u)
      total += BigInt(u.value)
      if (total >= target) break
    }
    return { selected, total }
  }

  private static async broadcastTx(base: string, rawHex: string): Promise<string> {
    const res = await fetch(`${base}/tx`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: rawHex
    })
    if (!res.ok) {
      throw new Error(`Broadcast ${res.status}: ${await res.text()}`)
    }
    return res.text()
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

export default BitcoinSigner
