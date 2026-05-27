import { createPublicClient, createWalletClient, http, type Address, type Hex } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { Chain } from "../../core/constants/chains.enum"
import { NetworkRegistry } from "../../core/constants/networks"
import type SendDraft from "../../models/send-draft.model"
import Transaction from "../../models/transaction.model"
import type { ChainSigner, SendResult, SignerSecrets } from "./chain-signer.interface"

class EvmSigner implements ChainSigner {
  private static readonly EVM_CHAINS: ReadonlyArray<Chain> = [
    Chain.EVM_SEPOLIA,
    Chain.EVM_POLYGON_AMOY,
    Chain.EVM_BASE_SEPOLIA
  ]

  public supports(chain: Chain): boolean {
    return EvmSigner.EVM_CHAINS.includes(chain)
  }

  public async send(secrets: SignerSecrets, draft: SendDraft): Promise<SendResult> {
    const cfg = NetworkRegistry.get(draft.chain)
    const account = privateKeyToAccount(secrets.privateKey as Hex)
    const transport = http(cfg.rpcUrl)
    const walletClient = createWalletClient({ account, transport })
    const publicClient = createPublicClient({ transport })

    const fees = await publicClient.estimateFeesPerGas()
    const nonce = await publicClient.getTransactionCount({ address: account.address, blockTag: "pending" })

    const rawTx = await account.signTransaction({
      to: draft.toAddress as Address,
      value: draft.amount,
      nonce,
      gas: 21000n,
      maxFeePerGas: fees.maxFeePerGas,
      maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      type: "eip1559",
      chainId: await publicClient.getChainId()
    })

    const hash = await walletClient.sendRawTransaction({ serializedTransaction: rawTx })

    return { hash, rawTx }
  }

  public async waitForConfirmation(chain: Chain, hash: string): Promise<Transaction> {
    const cfg = NetworkRegistry.get(chain)
    const client = createPublicClient({ transport: http(cfg.rpcUrl) })
    const receipt = await client.waitForTransactionReceipt({ hash: hash as Hex, timeout: 120_000 })
    const block = await client.getBlock({ blockNumber: receipt.blockNumber })

    return new Transaction({
      chain,
      hash,
      from: receipt.from,
      to: receipt.to ?? "",
      value: 0n,
      status: receipt.status === "success" ? "success" : "failed",
      blockNumber: Number(receipt.blockNumber),
      timestamp: new Date(Number(block.timestamp) * 1000),
      gasUsed: receipt.gasUsed,
      fee: receipt.gasUsed * receipt.effectiveGasPrice
    })
  }
}

export default EvmSigner
