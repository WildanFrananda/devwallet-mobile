import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import { StateFlow, UiState, ViewModel } from "react-native-mobile-mvvm"
import { takeUntil } from "rxjs"
import { Chain } from "../core/constants/chains.enum"
import { Tokens } from "../core/di/tokens"
import Contract, { type ContractFunction } from "../models/contract.model"
import type WalletRepository from "../repositories/wallet.repository"
import type ContractRepository from "../repositories/contract.repository"
import type ContractCallerDatasource from "../datasources/contract/contract-caller.datasource"

type CallOutcome =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "result"; value: string }
  | { kind: "tx"; hash: string }
  | { kind: "error"; message: string }

@Injectable()
class ContractTerminalViewModel extends ViewModel {
  private readonly _contracts = new StateFlow<ReadonlyArray<Contract>>([])
  private readonly _selected = new StateFlow<Contract | null>(null)
  private readonly _addForm = new StateFlow<{
    chain: Chain
    address: string
    name: string
    rawAbi: string
  }>({
    chain: Chain.EVM_SEPOLIA,
    address: "",
    name: "",
    rawAbi: ""
  })
  private readonly _addState = new StateFlow<UiState<Contract>>(UiState.idle())
  private readonly _callOutcome = new StateFlow<CallOutcome>({ kind: "idle" })
  private readonly _argInputs = new StateFlow<Record<string, ReadonlyArray<string>>>({})

  public readonly contracts$ = this._contracts.asReadOnly()
  public readonly selected$ = this._selected.asReadOnly()
  public readonly addForm$ = this._addForm.asReadOnly()
  public readonly addState$ = this._addState.asReadOnly()
  public readonly callOutcome$ = this._callOutcome.asReadOnly()
  public readonly argInputs$ = this._argInputs.asReadOnly()

  public constructor(
    @Inject(Tokens.ContractRepository) private readonly repo: ContractRepository,
    @Inject(Tokens.ContractCallerDatasource) private readonly caller: ContractCallerDatasource,
    @Inject(Tokens.WalletRepository) private readonly wallet: WalletRepository
  ) {
    super()
    this._contracts.value = this.repo.list()
    this.repo
      .stream$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => {
        this._contracts.value = list
      })
  }

  public select(contract: Contract | null): void {
    this._selected.value = contract
    this._callOutcome.value = { kind: "idle" }
  }

  public setAddField<K extends "chain" | "address" | "name" | "rawAbi">(
    key: K,
    value: K extends "chain" ? Chain : string
  ): void {
    this._addForm.value = { ...this._addForm.value, [key]: value }
  }

  public submitAdd(): void {
    const form = this._addForm.value
    try {
      const contract = this.repo.save(form)
      this._addState.value = UiState.success(contract)
      this._addForm.value = { chain: form.chain, address: "", name: "", rawAbi: "" }
    } catch (err) {
      this._addState.value = UiState.error(err instanceof Error ? err.message : String(err))
    }
  }

  public deleteContract(id: string): void {
    this.repo.delete(id)
    if (this._selected.value?.id === id) this._selected.value = null
  }

  public setArg(fnName: string, index: number, value: string): void {
    const current = this._argInputs.value[fnName] ?? []
    const next = [...current]
    next[index] = value
    this._argInputs.value = { ...this._argInputs.value, [fnName]: next }
  }

  public callFunction(fn: ContractFunction): void {
    const contract = this._selected.value
    if (!contract) return
    const args = this._argInputs.value[fn.name] ?? []
    this._callOutcome.value = { kind: "loading" }
    void this.launch(async signal => {
      try {
        if (contract.isRead(fn)) {
          const out = await this.caller.call({ contract, fn, args })
          if (signal.aborted) return
          this._callOutcome.value = { kind: "result", value: this.format(out.value) }
        } else {
          const account = await this.wallet.derive(contract.chain)
          if (signal.aborted) return
          const out = await this.caller.send({
            contract,
            fn,
            args,
            privateKey: account.privateKey
          })
          if (signal.aborted) return
          this._callOutcome.value = { kind: "tx", hash: out.txHash }
        }
      } catch (err) {
        if (signal.aborted) return
        this._callOutcome.value = {
          kind: "error",
          message: err instanceof Error ? err.message : String(err)
        }
      }
    })
  }

  public resetAddState(): void {
    this._addState.value = UiState.idle()
  }

  public resetOutcome(): void {
    this._callOutcome.value = { kind: "idle" }
  }

  private format(value: unknown): string {
    if (typeof value === "bigint") return value.toString()
    if (value === null || value === undefined) return String(value)
    if (typeof value === "object") {
      return JSON.stringify(
        value,
        (_k: string, v: unknown) => (typeof v === "bigint" ? v.toString() : v),
        2
      )
    }
    if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
      return String(value)
    }
    return JSON.stringify(value)
  }
}

export default ContractTerminalViewModel
export type { CallOutcome }
