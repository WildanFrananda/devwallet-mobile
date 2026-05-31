import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing"
import { SigningStargateClient, type DeliverTxResponse } from "@cosmjs/stargate"
import { stringToPath } from "@cosmjs/crypto"
import { Chain } from "../../core/constants/chains.enum"
import { NetworkRegistry } from "../../core/constants/networks"
import Bip44Paths from "../../core/crypto/bip44"
import { callAndLog } from "../../core/network/logging-transport"
import type SendDraft from "../../models/send-draft.model"
import Transaction from "../../models/transaction.model"
import type { ChainSigner, SendResult, SignerSecrets } from "./chain-signer.interface"

class CosmosSigner implements ChainSigner {
  public supports(chain: Chain): boolean {
    return chain === Chain.COSMOS_THETA
  }

  public async send(secrets: SignerSecrets, draft: SendDraft): Promise<SendResult> {
    const cfg = NetworkRegistry.get(draft.chain)
    const path = Bip44Paths.path(Chain.COSMOS_THETA, 0)
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(secrets.mnemonic, {
      prefix: "cosmos",
      hdPaths: [stringToPath(path)]
    })

    const client = await callAndLog({
      chain: draft.chain,
      endpoint: cfg.rpcUrl,
      method: "SigningStargateClient.connectWithSigner",
      params: {},
      run: () => SigningStargateClient.connectWithSigner(cfg.rpcUrl, wallet)
    })
    const fee = {
      amount: [{ denom: "uatom", amount: "5000" }],
      gas: "200000"
    }
    const result: DeliverTxResponse = await callAndLog({
      chain: draft.chain,
      endpoint: cfg.rpcUrl,
      method: "sendTokens",
      params: { to: draft.toAddress, amount: draft.amount.toString() },
      run: () =>
        client.sendTokens(
          draft.fromAddress,
          draft.toAddress,
          [{ denom: "uatom", amount: draft.amount.toString() }],
          fee,
          draft.note ?? ""
        )
    })

    return { hash: result.transactionHash, rawTx: "" }
  }

  public async waitForConfirmation(chain: Chain, hash: string): Promise<Transaction> {
    const cfg = NetworkRegistry.get(chain)
    const client = await callAndLog({
      chain,
      endpoint: cfg.rpcUrl,
      method: "SigningStargateClient.connect",
      params: {},
      run: () => SigningStargateClient.connect(cfg.rpcUrl)
    })
    const result = await callAndLog({
      chain,
      endpoint: cfg.rpcUrl,
      method: "getTx",
      params: { hash },
      run: () => client.getTx(hash)
    })
    if (!result) {
      throw new Error(`Cosmos tx ${hash} not found`)
    }
    return new Transaction({
      chain,
      hash,
      from: "",
      to: "",
      value: 0n,
      status: result.code === 0 ? "success" : "failed",
      blockNumber: result.height,
      timestamp: null,
      gasUsed: BigInt(result.gasUsed),
      fee: null
    })
  }
}

export default CosmosSigner
