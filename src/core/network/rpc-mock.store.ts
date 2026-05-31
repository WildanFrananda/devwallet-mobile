import { BehaviorSubject, type Observable } from "rxjs"

type MockEntry = {
  method: string
  response: unknown
  /** ISO string when the mock was registered. Used for UI sorting. */
  setAtIso: string
}

/**
 * Process-global mock registry. `loggingTransport` + `fetchAndLog`
 * consult this before hitting the real RPC, so any registered mock
 * short-circuits the network call and returns the stored payload.
 * Mocks are keyed by method string verbatim — same key the log row
 * displays, so the long-press UI can wire a row → its mock directly.
 *
 * Intentionally NOT persisted: mocks reset on app restart. Saved mocks
 * would mask production behavior across boots, which is a bigger debug
 * footgun than the convenience of remembering them.
 */
class RpcMockStore {
  private static readonly mocks = new Map<string, MockEntry>()
  private static readonly subject = new BehaviorSubject<ReadonlyArray<MockEntry>>([])

  public static set(method: string, response: unknown): void {
    RpcMockStore.mocks.set(method, {
      method,
      response,
      setAtIso: new Date().toISOString()
    })
    RpcMockStore.emit()
  }

  public static get(method: string): MockEntry | null {
    return RpcMockStore.mocks.get(method) ?? null
  }

  public static delete(method: string): void {
    if (RpcMockStore.mocks.delete(method)) RpcMockStore.emit()
  }

  public static list(): ReadonlyArray<MockEntry> {
    return Array.from(RpcMockStore.mocks.values())
  }

  public static clear(): void {
    if (RpcMockStore.mocks.size === 0) return
    RpcMockStore.mocks.clear()
    RpcMockStore.emit()
  }

  public static stream$(): Observable<ReadonlyArray<MockEntry>> {
    return RpcMockStore.subject.asObservable()
  }

  private static emit(): void {
    RpcMockStore.subject.next(RpcMockStore.list())
  }
}

export default RpcMockStore
export type { MockEntry }
