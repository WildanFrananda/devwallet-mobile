import { Account as SnAccount, CallData, RpcProvider, ec, uint256 } from "starknet"
import { createMMKV } from "react-native-mmkv"
import { Chain } from "../../core/constants/chains.enum"
import { NetworkRegistry } from "../../core/constants/networks"
import { OZ_ACCOUNT_CLASS_HASH } from "../../core/crypto/derivers/starknet.deriver"
import type SendDraft from "../../models/send-draft.model"
import Transaction from "../../models/transaction.model"
import type { ChainSigner, SendResult, SignerSecrets } from "./chain-signer.interface"

type MMKVHandle = ReturnType<typeof createMMKV>

// Sepolia STRK ERC-20 (same address on mainnet + sepolia).
const STRK_TOKEN_ADDRESS = "0x04718f5a0Fc34cC1AF16A1cdee98fFB20C31f5cD61D6Ab07201858f4287c938D"

/**
 * StarkNet signer with first-tx account deploy.
 *
 *   1. Detect if the OZ account is already deployed via
 *      `provider.getClassHashAt(address)`. Undeployed → catch.
 *   2. Call `account.deployAccount` to deploy the OZ Account contract paid
 *      by the account itself (needs STRK in the account already — the
 *      faucet prefunds the deterministic address).
 *   3. Then issue the standard `account.execute` STRK ERC-20 transfer.
 *
 * Cache the deployed flag in MMKV so subsequent sends skip the RPC probe.
 */
class StarknetSigner implements ChainSigner {
  private cached: MMKVHandle | null = null

  public supports(chain: Chain): boolean {
    return chain === Chain.STARKNET_SEPOLIA
  }

  public async send(secrets: SignerSecrets, draft: SendDraft): Promise<SendResult> {
    const cfg = NetworkRegistry.get(Chain.STARKNET_SEPOLIA)
    const provider = new RpcProvider({ nodeUrl: cfg.rpcUrl })
    const account = new SnAccount({
      provider,
      address: draft.fromAddress,
      signer: secrets.privateKey
    })

    await this.ensureDeployed(provider, account, secrets, draft.fromAddress)

    const amount = uint256.bnToUint256(draft.amount.toString())
    const calldata = CallData.compile({
      recipient: draft.toAddress,
      amount
    })
    const { transaction_hash } = await account.execute({
      contractAddress: STRK_TOKEN_ADDRESS,
      entrypoint: "transfer",
      calldata
    })

    return { hash: transaction_hash, rawTx: transaction_hash }
  }

  public async waitForConfirmation(chain: Chain, txHash: string): Promise<Transaction> {
    const cfg = NetworkRegistry.get(chain)
    const provider = new RpcProvider({ nodeUrl: cfg.rpcUrl })
    const receipt = await provider.waitForTransaction(txHash)
    const value: unknown = (receipt as { value?: unknown }).value ?? receipt

    return new Transaction({
      chain,
      hash: txHash,
      from: "",
      to: "",
      value: 0n,
      status: StarknetSigner.isSuccessful(value) ? "success" : "failed",
      blockNumber: StarknetSigner.readNumberField(value, "block_number") ?? null,
      timestamp: StarknetSigner.timestampField(value),
      gasUsed: null,
      fee: null
    })
  }

  private async ensureDeployed(
    provider: RpcProvider,
    account: SnAccount,
    secrets: SignerSecrets,
    address: string
  ): Promise<void> {
    if (this.deployedFlag(address)) return
    try {
      await provider.getClassHashAt(address)
      this.markDeployed(address)
      return
    } catch {
      // not deployed — fall through
    }

    const publicKey = StarknetSigner.publicKeyHex(secrets.privateKey)
    const constructorCalldata = CallData.compile({ publicKey })
    const { transaction_hash, contract_address } = await account.deployAccount({
      classHash: OZ_ACCOUNT_CLASS_HASH,
      constructorCalldata,
      addressSalt: publicKey
    })
    if (contract_address.toLowerCase() !== address.toLowerCase()) {
      throw new Error(`Deployed address ${contract_address} does not match derived ${address}`)
    }
    await provider.waitForTransaction(transaction_hash)
    this.markDeployed(address)
  }

  private deployedFlag(address: string): boolean {
    return this.storage().getBoolean(`starknet.account.deployed.${address.toLowerCase()}`) ?? false
  }

  private markDeployed(address: string): void {
    this.storage().set(`starknet.account.deployed.${address.toLowerCase()}`, true)
  }

  private storage(): MMKVHandle {
    if (!this.cached) {
      this.cached = createMMKV({ id: "devwallet.starknet" })
    }
    return this.cached
  }

  private static publicKeyHex(privateKey: string): string {
    return ec.starkCurve.getStarkKey(privateKey)
  }

  private static readNumberField(block: unknown, key: string): number | undefined {
    if (block && typeof block === "object" && key in block) {
      const value = (block as Record<string, unknown>)[key]
      if (typeof value === "number") return value
      if (typeof value === "bigint") return Number(value)
    }
    return undefined
  }

  private static timestampField(block: unknown): Date | null {
    const ts = StarknetSigner.readNumberField(block, "block_timestamp")
    return ts ? new Date(ts * 1000) : null
  }

  private static isSuccessful(block: unknown): boolean {
    if (!block || typeof block !== "object") return true
    const status = (block as Record<string, unknown>)["execution_status"]
    if (typeof status === "string") return status.toUpperCase() === "SUCCEEDED"
    return true
  }
}

export default StarknetSigner
