import { Chain } from "../core/constants/chains.enum"

type ContractFunctionParam = {
  name: string
  type: string
}

type ContractFunction = {
  name: string
  inputs: ReadonlyArray<ContractFunctionParam>
  outputs: ReadonlyArray<ContractFunctionParam>
  /** "view" | "pure" → read; "nonpayable" | "payable" | "external" → write. */
  stateMutability: "view" | "pure" | "nonpayable" | "payable" | "external"
}

type AbiKind = "evm" | "starknet" | "solana"

class Contract {
  public readonly id: string
  public readonly chain: Chain
  public readonly address: string
  public readonly name: string
  public readonly abiKind: AbiKind
  public readonly rawAbi: string
  public readonly functions: ReadonlyArray<ContractFunction>
  public readonly savedAt: Date

  public constructor(params: {
    id: string
    chain: Chain
    address: string
    name: string
    abiKind: AbiKind
    rawAbi: string
    functions: ReadonlyArray<ContractFunction>
    savedAt: Date
  }) {
    this.id = params.id
    this.chain = params.chain
    this.address = params.address
    this.name = params.name
    this.abiKind = params.abiKind
    this.rawAbi = params.rawAbi
    this.functions = params.functions
    this.savedAt = params.savedAt
  }

  public isRead(fn: ContractFunction): boolean {
    return fn.stateMutability === "view" || fn.stateMutability === "pure"
  }

  public toJSON(): ContractJson {
    return {
      id: this.id,
      chain: this.chain,
      address: this.address,
      name: this.name,
      abiKind: this.abiKind,
      rawAbi: this.rawAbi,
      functions: this.functions.map(f => ({ ...f, inputs: [...f.inputs], outputs: [...f.outputs] })),
      savedAtIso: this.savedAt.toISOString()
    }
  }

  public static fromJSON(j: ContractJson): Contract {
    return new Contract({
      id: j.id,
      chain: j.chain as Chain,
      address: j.address,
      name: j.name,
      abiKind: j.abiKind,
      rawAbi: j.rawAbi,
      functions: j.functions,
      savedAt: new Date(j.savedAtIso)
    })
  }
}

type ContractJson = {
  id: string
  chain: string
  address: string
  name: string
  abiKind: AbiKind
  rawAbi: string
  functions: ReadonlyArray<ContractFunction>
  savedAtIso: string
}

export default Contract
export type { ContractFunction, ContractFunctionParam, AbiKind, ContractJson }
