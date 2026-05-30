import { Injectable } from "react-native-mobile-mvvm/di"
import { createPublicClient, createWalletClient, http, type Abi, type Address, type Hex } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { Chain } from "../../core/constants/chains.enum"
import { NetworkRegistry } from "../../core/constants/networks"
import { loggingTransport } from "../../core/network/logging-transport"
import Contract from "../../models/contract.model"
import type { ContractFunction } from "../../models/contract.model"

type CallArgs = {
  contract: Contract
  fn: ContractFunction
  // Args are user-provided strings — we coerce per ABI type.
  args: ReadonlyArray<string>
}

type SendArgs = CallArgs & { privateKey: string }

type CallResult = {
  value: unknown
}

type SendResult = {
  txHash: string
}

const EVM_CHAINS = new Set<Chain>([
  Chain.EVM_SEPOLIA,
  Chain.EVM_POLYGON_AMOY,
  Chain.EVM_BASE_SEPOLIA
])

@Injectable()
class ContractCallerDatasource {
  public async call(input: CallArgs): Promise<CallResult> {
    if (EVM_CHAINS.has(input.contract.chain)) return this.evmRead(input)
    throw new Error(`Contract read not supported on ${input.contract.chain} yet`)
  }

  public async send(input: SendArgs): Promise<SendResult> {
    if (EVM_CHAINS.has(input.contract.chain)) return this.evmWrite(input)
    throw new Error(`Contract send not supported on ${input.contract.chain} yet`)
  }

  private async evmRead(input: CallArgs): Promise<CallResult> {
    const cfg = NetworkRegistry.get(input.contract.chain)
    const client = createPublicClient({
      transport: loggingTransport(http(cfg.rpcUrl), input.contract.chain, cfg.rpcUrl)
    })
    const abi = JSON.parse(input.contract.rawAbi) as Abi
    const value = await client.readContract({
      address: input.contract.address as Address,
      abi,
      functionName: input.fn.name,
      args: this.coerceEvmArgs(input.fn, input.args)
    })
    return { value }
  }

  private async evmWrite(input: SendArgs): Promise<SendResult> {
    const cfg = NetworkRegistry.get(input.contract.chain)
    const account = privateKeyToAccount(input.privateKey as Hex)
    const transport = loggingTransport(http(cfg.rpcUrl), input.contract.chain, cfg.rpcUrl)
    const wallet = createWalletClient({ account, transport })
    const publicClient = createPublicClient({ transport })
    const abi = JSON.parse(input.contract.rawAbi) as Abi
    const { request } = await publicClient.simulateContract({
      account,
      address: input.contract.address as Address,
      abi,
      functionName: input.fn.name,
      args: this.coerceEvmArgs(input.fn, input.args)
    })
    const hash = await wallet.writeContract(request)
    return { txHash: hash }
  }

  /**
   * Map user-supplied string inputs onto the JS types viem expects.
   * Conservative on purpose — anything fancier than these primitives
   * lands the raw string and lets viem report a type error.
   */
  private coerceEvmArgs(fn: ContractFunction, args: ReadonlyArray<string>): ReadonlyArray<unknown> {
    return fn.inputs.map((param, i) => {
      const raw = args[i] ?? ""
      const t = param.type
      if (t === "bool") return raw.toLowerCase() === "true"
      if (t.startsWith("uint") || t.startsWith("int")) {
        if (raw.trim() === "") throw new Error(`Empty value for ${param.name}: ${t}`)
        return BigInt(raw)
      }
      if (t === "address" || t.startsWith("bytes") || t === "string") return raw
      if (t.endsWith("[]")) {
        try {
          return JSON.parse(raw) as unknown
        } catch {
          throw new Error(`Could not parse ${param.name} as JSON array`)
        }
      }
      return raw
    })
  }
}

export default ContractCallerDatasource
export type { CallArgs, CallResult, SendArgs, SendResult as ContractSendResult }
