import { Injectable } from "react-native-mobile-mvvm/di"
import { BehaviorSubject, type Observable } from "rxjs"
import { createMMKV } from "react-native-mmkv"
import { Chain } from "../core/constants/chains.enum"
import type { GasTier } from "../datasources/gas/gas-oracle.datasource"
import GasHistoryRepository, { type GasSample } from "./gas-history.repository"

type MMKVHandle = ReturnType<typeof createMMKV>

const STORAGE_ID = "devwallet.gas-history"
// 24h / 5min = 288 samples per chain.
const MAX_SAMPLES = 288

type SerializedTier = Omit<GasTier, "baseFee" | "maxPriorityFeePerGas" | "maxFeePerGas" | "estimatedTransferWei"> & {
  baseFee: string
  maxPriorityFeePerGas: string
  maxFeePerGas: string
  estimatedTransferWei: string
}

type SerializedSample = {
  chain: string
  takenAtIso: string
  baseFee: string
  tiers: ReadonlyArray<SerializedTier>
}

@Injectable()
class GasHistoryRepositoryImpl extends GasHistoryRepository {
  private cachedStorage: MMKVHandle | null = null
  private cachedSamples: Map<Chain, GasSample[]> = new Map()
  private subjects: Map<Chain, BehaviorSubject<ReadonlyArray<GasSample>>> = new Map()

  public recordIfDue(sample: GasSample, minSpacingMs: number): boolean {
    const list = this.load(sample.chain)
    const last = list[0]
    if (last) {
      const elapsed = Date.now() - new Date(last.takenAtIso).getTime()
      if (elapsed < minSpacingMs) return false
    }
    const next = [sample, ...list].slice(0, MAX_SAMPLES)
    this.persist(sample.chain, next)
    this.subject(sample.chain).next(next)
    return true
  }

  public list(chain: Chain): ReadonlyArray<GasSample> {
    return this.load(chain).slice()
  }

  public stream$(chain: Chain): Observable<ReadonlyArray<GasSample>> {
    return this.subject(chain).asObservable()
  }

  public clear(chain: Chain): void {
    this.persist(chain, [])
    this.subject(chain).next([])
  }

  private subject(chain: Chain): BehaviorSubject<ReadonlyArray<GasSample>> {
    let subj = this.subjects.get(chain)
    if (!subj) {
      subj = new BehaviorSubject<ReadonlyArray<GasSample>>(this.load(chain))
      this.subjects.set(chain, subj)
    }
    return subj
  }

  private load(chain: Chain): GasSample[] {
    const cached = this.cachedSamples.get(chain)
    if (cached) return cached
    const raw = this.storage().getString(this.key(chain))
    if (!raw) {
      this.cachedSamples.set(chain, [])
      return []
    }
    try {
      const parsed = JSON.parse(raw) as SerializedSample[]
      const restored = parsed.map(p => this.deserialize(p))
      this.cachedSamples.set(chain, restored)
      return restored
    } catch {
      this.cachedSamples.set(chain, [])
      return []
    }
  }

  private persist(chain: Chain, samples: GasSample[]): void {
    this.cachedSamples.set(chain, samples)
    this.storage().set(this.key(chain), JSON.stringify(samples.map(s => this.serialize(s))))
  }

  private serialize(s: GasSample): SerializedSample {
    return {
      chain: s.chain,
      takenAtIso: s.takenAtIso,
      baseFee: s.baseFee.toString(),
      tiers: s.tiers.map(t => ({
        label: t.label,
        baseFee: t.baseFee.toString(),
        maxPriorityFeePerGas: t.maxPriorityFeePerGas.toString(),
        maxFeePerGas: t.maxFeePerGas.toString(),
        estimatedTransferWei: t.estimatedTransferWei.toString()
      }))
    }
  }

  private deserialize(p: SerializedSample): GasSample {
    return {
      chain: p.chain as Chain,
      takenAtIso: p.takenAtIso,
      baseFee: BigInt(p.baseFee),
      tiers: p.tiers.map(t => ({
        label: t.label,
        baseFee: BigInt(t.baseFee),
        maxPriorityFeePerGas: BigInt(t.maxPriorityFeePerGas),
        maxFeePerGas: BigInt(t.maxFeePerGas),
        estimatedTransferWei: BigInt(t.estimatedTransferWei)
      }))
    }
  }

  private key(chain: Chain): string {
    return `gas-history.${chain}.v1`
  }

  private storage(): MMKVHandle {
    if (!this.cachedStorage) {
      this.cachedStorage = createMMKV({ id: STORAGE_ID })
    }
    return this.cachedStorage
  }
}

export default GasHistoryRepositoryImpl
