import { Observable } from "rxjs"
import RpcLog from "../models/rpc-log.model"

abstract class RpcLogRepository {
  /** Push a new log entry. May evict the oldest entry to stay under cap. */
  public abstract append(log: RpcLog): void

  /** Snapshot of all currently retained logs, newest first. */
  public abstract list(): RpcLog[]

  /** Reactive stream of the full log list. Emits on every append/clear. */
  public abstract stream$(): Observable<RpcLog[]>

  /** Drop all logs. */
  public abstract clear(): void

  /** Serialize the buffer as a pretty-printed JSON string for export. */
  public abstract exportJson(): string
}

export default RpcLogRepository
