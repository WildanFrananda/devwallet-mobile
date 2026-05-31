import { Injectable } from "react-native-mobile-mvvm/di"
import { BehaviorSubject, type Observable } from "rxjs"
import { createMMKV } from "react-native-mmkv"
import Replay, { type ReplayJson, type ReplayStatus } from "../models/replay.model"
import ReplayRepository from "./replay.repository"

type MMKVHandle = ReturnType<typeof createMMKV>

const STORAGE_ID = "devwallet.replays"
const STORAGE_KEY = "replays.v1"
const MAX_ENTRIES = 50

@Injectable()
class ReplayRepositoryImpl extends ReplayRepository {
  private cachedStorage: MMKVHandle | null = null
  private cachedList: Replay[] | null = null
  private readonly subject = new BehaviorSubject<Replay[]>([])

  public constructor() {
    super()
    queueMicrotask(() => this.subject.next(this.load()))
  }

  public save(replay: Replay): void {
    const next = [replay, ...this.load().filter(r => r.id !== replay.id)].slice(0, MAX_ENTRIES)
    this.persist(next)
    this.subject.next(next)
  }

  public update(
    id: string,
    patch: Partial<{ replayHash: string | null; status: ReplayStatus; errorMessage: string | null }>
  ): void {
    const existing = this.load().find(r => r.id === id)
    if (!existing) return
    const merged = new Replay({
      id: existing.id,
      originHash: existing.originHash,
      originChain: existing.originChain,
      replayChain: existing.replayChain,
      decoded: existing.decoded,
      replayHash: patch.replayHash ?? existing.replayHash,
      status: patch.status ?? existing.status,
      errorMessage: patch.errorMessage ?? existing.errorMessage,
      createdAt: existing.createdAt
    })
    this.save(merged)
  }

  public list(): Replay[] {
    return this.load().slice()
  }

  public get(id: string): Replay | null {
    return this.load().find(r => r.id === id) ?? null
  }

  public delete(id: string): void {
    const next = this.load().filter(r => r.id !== id)
    this.persist(next)
    this.subject.next(next)
  }

  public stream$(): Observable<Replay[]> {
    return this.subject.asObservable()
  }

  private load(): Replay[] {
    if (this.cachedList !== null) return this.cachedList
    const raw = this.storage().getString(STORAGE_KEY)
    if (!raw) {
      this.cachedList = []
      return this.cachedList
    }
    try {
      const parsed = JSON.parse(raw) as ReplayJson[]
      this.cachedList = parsed.map(j => Replay.fromJSON(j))
    } catch {
      this.cachedList = []
    }
    return this.cachedList
  }

  private persist(next: Replay[]): void {
    this.cachedList = next
    this.storage().set(STORAGE_KEY, JSON.stringify(next.map(r => r.toJSON())))
  }

  private storage(): MMKVHandle {
    if (!this.cachedStorage) {
      this.cachedStorage = createMMKV({ id: STORAGE_ID })
    }
    return this.cachedStorage
  }
}

export default ReplayRepositoryImpl
