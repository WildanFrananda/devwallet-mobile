import RpcLog from "../../models/rpc-log.model"
import type RpcLogRepository from "../../repositories/rpc-log.repository"

/**
 * Process-global sink so transport wrappers (viem, fetch, StargateClient,
 * etc.) can record RPC calls without threading the repository through
 * every constructor. `RpcLogRepositoryImpl` registers itself in the DI
 * bootstrap and any logging helper just calls `RpcLogSink.record(log)`.
 *
 * Falls back to a no-op when no repo is registered (e.g. in tests where
 * we don't bother wiring DI).
 */
class RpcLogSink {
  private static repo: RpcLogRepository | null = null

  public static register(repo: RpcLogRepository): void {
    RpcLogSink.repo = repo
  }

  public static reset(): void {
    RpcLogSink.repo = null
  }

  public static record(log: RpcLog): void {
    if (RpcLogSink.repo) RpcLogSink.repo.append(log)
  }
}

export default RpcLogSink
