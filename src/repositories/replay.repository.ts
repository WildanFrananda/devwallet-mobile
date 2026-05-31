import { Observable } from "rxjs"
import Replay from "../models/replay.model"

abstract class ReplayRepository {
  public abstract save(replay: Replay): void
  public abstract update(id: string, patch: Partial<{ replayHash: string | null; status: Replay["status"]; errorMessage: string | null }>): void
  public abstract list(): Replay[]
  public abstract get(id: string): Replay | null
  public abstract delete(id: string): void
  public abstract stream$(): Observable<Replay[]>
}

export default ReplayRepository
