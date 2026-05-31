import { Injectable } from "react-native-mobile-mvvm/di"
import { createPublicClient, createWalletClient, http, type Abi, type Address, type Hex } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import {
  Account as StarknetAccount,
  Contract as StarknetContract,
  RpcProvider as StarknetRpcProvider,
  CallData,
  type Abi as StarknetAbi
} from "starknet"
import {
  AnchorProvider,
  Program,
  Wallet,
  BN,
  type Idl
} from "@coral-xyz/anchor"
import {
  Connection,
  Keypair,
  PublicKey
} from "@solana/web3.js"
import { Chain } from "../../core/constants/chains.enum"
import { NetworkRegistry } from "../../core/constants/networks"
import { callAndLog, loggingTransport } from "../../core/network/logging-transport"
import Contract from "../../models/contract.model"
import type { ContractFunction } from "../../models/contract.model"

type CallArgs = {
  contract: Contract
  fn: ContractFunction
  // Args are user-provided strings — we coerce per ABI type.
  args: ReadonlyArray<string>
}

type SendArgs = CallArgs & {
  privateKey: string
  /** Sender account address. Required for non-EVM chains (Starknet, etc.). */
  senderAddress?: string
}

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
    if (input.contract.chain === Chain.STARKNET_SEPOLIA) return this.starknetRead(input)
    if (input.contract.chain === Chain.SOLANA_DEVNET) return this.solanaRead(input)
    throw new Error(`Contract read not supported on ${input.contract.chain} yet`)
  }

  public async send(input: SendArgs): Promise<SendResult> {
    if (EVM_CHAINS.has(input.contract.chain)) return this.evmWrite(input)
    if (input.contract.chain === Chain.STARKNET_SEPOLIA) return this.starknetWrite(input)
    if (input.contract.chain === Chain.SOLANA_DEVNET) return this.solanaWrite(input)
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

  private async starknetRead(input: CallArgs): Promise<CallResult> {
    const cfg = NetworkRegistry.get(input.contract.chain)
    const provider = new StarknetRpcProvider({ nodeUrl: cfg.rpcUrl })
    const abi = JSON.parse(input.contract.rawAbi) as StarknetAbi
    const contract = new StarknetContract({
      abi,
      address: input.contract.address,
      providerOrAccount: provider
    })
    const calldata = this.starknetCalldata(input.fn, input.args)
    const value = await callAndLog({
      chain: input.contract.chain,
      endpoint: cfg.rpcUrl,
      method: `starknet_call:${input.fn.name}`,
      params: { contract: input.contract.address, calldata },
      run: () => contract.call(input.fn.name, calldata)
    })
    return { value }
  }

  private async starknetWrite(input: SendArgs): Promise<SendResult> {
    if (!input.senderAddress) {
      throw new Error("Starknet write requires senderAddress (use wallet.derive to get it)")
    }
    const cfg = NetworkRegistry.get(input.contract.chain)
    const provider = new StarknetRpcProvider({ nodeUrl: cfg.rpcUrl })
    const account = new StarknetAccount({
      provider,
      address: input.senderAddress,
      signer: input.privateKey
    })
    const calldata = this.starknetCalldata(input.fn, input.args)
    const { transaction_hash } = await callAndLog({
      chain: input.contract.chain,
      endpoint: cfg.rpcUrl,
      method: `starknet_execute:${input.fn.name}`,
      params: { contract: input.contract.address, calldata },
      run: () =>
        account.execute({
          contractAddress: input.contract.address,
          entrypoint: input.fn.name,
          calldata
        })
    })
    return { txHash: transaction_hash }
  }

  /**
   * Solana Anchor read. Treats the `args[]` slot for each instruction
   * input as the user-pasted JSON value, then routes to either
   * `program.methods[fn].view()` (Anchor supports view simulation when
   * the IDL marks the function) or `program.account.<name>.fetch(pk)`
   * when the user invokes a synthetic `account.<name>` method.
   *
   * Reality check: Anchor instructions almost always need a list of
   * accounts beyond plain args. The auto-form has no way to derive
   * PDAs, so we accept an extra trailing arg named `__accounts` whose
   * value is a JSON object `{ accountName: "base58-pubkey" }`. Caller
   * can omit it for instructions with no extra accounts.
   */
  private async solanaRead(input: CallArgs): Promise<CallResult> {
    const cfg = NetworkRegistry.get(input.contract.chain)
    const { program, methodArgs, accounts } = this.solanaCommonSetup(input)
    const builder = this.solanaMethodBuilder(program, input.fn.name, methodArgs, accounts)
    const method = typeof builder.view === "function" ? "anchor.view" : "anchor.simulate"
    const value = await callAndLog({
      chain: input.contract.chain,
      endpoint: cfg.rpcUrl,
      method: `${method}:${input.fn.name}`,
      params: { args: methodArgs, accounts: accounts ? Object.keys(accounts) : null },
      run: () => (typeof builder.view === "function" ? builder.view() : builder.simulate())
    })
    return { value }
  }

  private async solanaWrite(input: SendArgs): Promise<SendResult> {
    const cfg = NetworkRegistry.get(input.contract.chain)
    const { program, methodArgs, accounts } = this.solanaCommonSetup(input, input.privateKey)
    const builder = this.solanaMethodBuilder(program, input.fn.name, methodArgs, accounts)
    const txHash = await callAndLog({
      chain: input.contract.chain,
      endpoint: cfg.rpcUrl,
      method: `anchor.rpc:${input.fn.name}`,
      params: { args: methodArgs, accounts: accounts ? Object.keys(accounts) : null },
      run: () => builder.rpc()
    })
    return { txHash }
  }

  /**
   * Anchor's typed `methods[name]` cannot be resolved statically from a
   * runtime string, so we narrow the dispatch table to a callable
   * indexable shape and re-expose only the builder ops we use.
   */
  private solanaMethodBuilder(
    program: Program,
    name: string,
    methodArgs: ReadonlyArray<unknown>,
    accounts: Record<string, PublicKey> | null
  ): {
    view?: () => Promise<unknown>
    simulate: () => Promise<unknown>
    rpc: () => Promise<string>
  } {
    const methods = program.methods as unknown as Record<
      string,
      (...args: unknown[]) => {
        accounts: (a: Record<string, PublicKey>) => unknown
        view?: () => Promise<unknown>
        simulate: () => Promise<unknown>
        rpc: () => Promise<string>
      }
    >
    const ctor = methods[name]
    if (typeof ctor !== "function") {
      throw new Error(`Anchor method "${name}" not found on program IDL`)
    }
    let builder = ctor(...methodArgs)
    if (accounts) builder = builder.accounts(accounts) as typeof builder
    return builder
  }

  private solanaCommonSetup(
    input: CallArgs,
    privateKeyHex?: string
  ): {
    program: Program
    methodArgs: unknown[]
    accounts: Record<string, PublicKey> | null
  } {
    const cfg = NetworkRegistry.get(input.contract.chain)
    const connection = new Connection(cfg.rpcUrl, "confirmed")
    // The IDL's `address` field carries the program id; the Program ctor
    // reads it directly, so we keep the saved contract address parsed as
    // a sanity check (throws on malformed Base58).
    const idl = JSON.parse(input.contract.rawAbi) as Idl & { address?: string }
    new PublicKey(idl.address ?? input.contract.address)

    const keypair = privateKeyHex
      ? Keypair.fromSecretKey(this.hexToBytes(privateKeyHex))
      : Keypair.generate()
    const wallet = new Wallet(keypair)
    const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" })
    const program = new Program(idl, provider)

    const { methodArgs, accounts } = this.splitSolanaArgs(input.fn, input.args)
    return { program, methodArgs, accounts }
  }

  /**
   * Extract regular instruction args from the auto-form. The last input
   * is treated as the optional `__accounts` JSON map and converted into
   * `PublicKey` instances for Anchor.
   */
  private splitSolanaArgs(
    fn: ContractFunction,
    args: ReadonlyArray<string>
  ): { methodArgs: unknown[]; accounts: Record<string, PublicKey> | null } {
    const methodArgs: unknown[] = []
    let accounts: Record<string, PublicKey> | null = null
    for (let i = 0; i < fn.inputs.length; i++) {
      const param = fn.inputs[i]
      if (!param) continue
      const raw = args[i] ?? ""
      if (param.name === "__accounts") {
        if (raw.trim().length === 0) continue
        try {
          const parsed = JSON.parse(raw) as Record<string, string>
          accounts = {}
          for (const [k, v] of Object.entries(parsed)) accounts[k] = new PublicKey(v)
        } catch {
          throw new Error("__accounts must be a JSON object of {name: base58Pubkey}")
        }
        continue
      }
      methodArgs.push(this.coerceSolanaArg(param.type, raw))
    }
    return { methodArgs, accounts }
  }

  private coerceSolanaArg(type: string, raw: string): unknown {
    if (raw.trim().length === 0) return null
    if (type === "bool") return raw.toLowerCase() === "true"
    if (type.startsWith("u") || type.startsWith("i")) return new BN(raw)
    if (type === "publicKey" || type === "pubkey") return new PublicKey(raw)
    if (type === "string") return raw
    // Nested / enum types — assume user paste valid JSON.
    try {
      return JSON.parse(raw)
    } catch {
      return raw
    }
  }

  private hexToBytes(hex: string): Uint8Array {
    const clean = hex.startsWith("0x") ? hex.slice(2) : hex
    const out = new Uint8Array(clean.length / 2)
    for (let i = 0; i < out.length; i++) {
      out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
    }
    return out
  }

  private starknetCalldata(fn: ContractFunction, args: ReadonlyArray<string>): string[] {
    const obj: Record<string, string> = {}
    for (let i = 0; i < fn.inputs.length; i++) {
      const param = fn.inputs[i]
      if (!param) continue
      obj[param.name || `arg${i}`] = args[i] ?? ""
    }
    return CallData.compile(obj)
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
