import { Injectable } from "react-native-mobile-mvvm/di"
import { BehaviorSubject, type Observable } from "rxjs"
import { createMMKV } from "react-native-mmkv"
import RpcLog, { type RpcLogJson } from "../models/rpc-log.model"
import RpcLogRepository from "./rpc-log.repository"

type MMKVHandle = ReturnType<typeof createMMKV>

const STORAGE_ID = "devwallet.rpc-logs"
const STORAGE_KEY = "rpc-log.buffer.v1"
const MAX_ENTRIES = 200

/**
 * Ring-buffer-backed log store. Persists the buffer to MMKV so logs
 * survive app restarts (handy when debugging issues that show up at
 * boot). Capped at 200 entries to keep MMKV writes small — the
 * mobile app is a debug tool, not a centralised log sink.
 */
@Injectable()
class RpcLogRepositoryImpl extends RpcLogRepository {
  private cachedStorage: MMKVHandle | null = null
  private cachedBuffer: RpcLog[] | null = null
  private readonly subject = new BehaviorSubject<RpcLog[]>([])

  public constructor() {
    super()
    // Hydrate the stream from persisted state without forcing MMKV access
    // during DI bootstrap (Jest mocks don't always include MMKV).
    queueMicrotask(() => this.subject.next(this.buffer()))
  }

  public append(log: RpcLog): void {
    const next = [log, ...this.buffer()].slice(0, MAX_ENTRIES)
    this.persist(next)
    this.subject.next(next)
  }

  public list(): RpcLog[] {
    return this.buffer().slice()
  }

  public stream$(): Observable<RpcLog[]> {
    return this.subject.asObservable()
  }

  public clear(): void {
    this.persist([])
    this.subject.next([])
  }

  public exportJson(): string {
    const dump = {
      exportedAt: new Date().toISOString(),
      count: this.buffer().length,
      entries: this.buffer().map(l => l.toJSON())
    }
    return JSON.stringify(dump, null, 2)
  }

  private buffer(): RpcLog[] {
    if (this.cachedBuffer !== null) return this.cachedBuffer
    const raw = this.storage().getString(STORAGE_KEY)
    if (!raw) {
      this.cachedBuffer = []
      return this.cachedBuffer
    }
    try {
      const parsed = JSON.parse(raw) as RpcLogJson[]
      this.cachedBuffer = parsed.map(j => RpcLog.fromJSON(j))
    } catch {
      this.cachedBuffer = []
    }
    return this.cachedBuffer
  }

  private persist(next: RpcLog[]): void {
    this.cachedBuffer = next
    this.storage().set(STORAGE_KEY, JSON.stringify(next.map(l => l.toJSON())))
  }

  private storage(): MMKVHandle {
    if (!this.cachedStorage) {
      this.cachedStorage = createMMKV({ id: STORAGE_ID })
    }
    return this.cachedStorage
  }
}

export default RpcLogRepositoryImpl
