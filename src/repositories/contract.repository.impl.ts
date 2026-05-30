import { Injectable } from "react-native-mobile-mvvm/di"
import { BehaviorSubject, type Observable } from "rxjs"
import { createMMKV } from "react-native-mmkv"
import { Chain } from "../core/constants/chains.enum"
import Contract, { type ContractJson } from "../models/contract.model"
import { parseAbi } from "../core/abi/abi-parser"
import ContractRepository from "./contract.repository"

type MMKVHandle = ReturnType<typeof createMMKV>

const STORAGE_ID = "devwallet.contracts"
const STORAGE_KEY = "contracts.v1"

@Injectable()
class ContractRepositoryImpl extends ContractRepository {
  private cachedStorage: MMKVHandle | null = null
  private cachedList: Contract[] | null = null
  private readonly subject = new BehaviorSubject<Contract[]>([])

  public constructor() {
    super()
    queueMicrotask(() => this.subject.next(this.load()))
  }

  public save(input: { chain: Chain; address: string; name: string; rawAbi: string }): Contract {
    const parsed = parseAbi(input.rawAbi)
    const contract = new Contract({
      id: `${input.chain}:${input.address.toLowerCase()}`,
      chain: input.chain,
      address: input.address,
      name: input.name.trim().length === 0 ? input.address : input.name.trim(),
      abiKind: parsed.kind,
      rawAbi: input.rawAbi,
      functions: parsed.functions,
      savedAt: new Date()
    })
    const existing = this.load().filter(c => c.id !== contract.id)
    const next = [contract, ...existing]
    this.persist(next)
    this.subject.next(next)
    return contract
  }

  public list(): Contract[] {
    return this.load().slice()
  }

  public get(id: string): Contract | null {
    return this.load().find(c => c.id === id) ?? null
  }

  public delete(id: string): void {
    const next = this.load().filter(c => c.id !== id)
    this.persist(next)
    this.subject.next(next)
  }

  public stream$(): Observable<Contract[]> {
    return this.subject.asObservable()
  }

  private load(): Contract[] {
    if (this.cachedList !== null) return this.cachedList
    const raw = this.storage().getString(STORAGE_KEY)
    if (!raw) {
      this.cachedList = []
      return this.cachedList
    }
    try {
      const parsed = JSON.parse(raw) as ContractJson[]
      this.cachedList = parsed.map(j => Contract.fromJSON(j))
    } catch {
      this.cachedList = []
    }
    return this.cachedList
  }

  private persist(next: Contract[]): void {
    this.cachedList = next
    this.storage().set(STORAGE_KEY, JSON.stringify(next.map(c => c.toJSON())))
  }

  private storage(): MMKVHandle {
    if (!this.cachedStorage) {
      this.cachedStorage = createMMKV({ id: STORAGE_ID })
    }
    return this.cachedStorage
  }
}

export default ContractRepositoryImpl
