import { Chain } from "../core/constants/chains.enum"

type DecodedArg = {
  name: string
  type: string
  /** Stringified value — bigints converted to decimal string for portability. */
  value: string
}

type DecodedTx = {
  hash: string
  from: string
  to: string | null
  value: bigint
  input: `0x${string}`
  /** Null when function selector can't be matched against any known ABI. */
  functionName: string | null
  args: ReadonlyArray<DecodedArg>
  /** Raw ABI snippet used to decode, if matched (for the UI display). */
  matchedAbi: string | null
}

type ReplayStatus = "pending" | "broadcast" | "confirmed" | "failed"

class Replay {
  public readonly id: string
  public readonly originHash: string
  public readonly originChain: ReplayOriginChain
  public readonly replayChain: Chain
  public readonly decoded: DecodedTx
  public readonly replayHash: string | null
  public readonly status: ReplayStatus
  public readonly errorMessage: string | null
  public readonly createdAt: Date

  public constructor(params: {
    id: string
    originHash: string
    originChain: ReplayOriginChain
    replayChain: Chain
    decoded: DecodedTx
    replayHash?: string | null
    status: ReplayStatus
    errorMessage?: string | null
    createdAt: Date
  }) {
    this.id = params.id
    this.originHash = params.originHash
    this.originChain = params.originChain
    this.replayChain = params.replayChain
    this.decoded = params.decoded
    this.replayHash = params.replayHash ?? null
    this.status = params.status
    this.errorMessage = params.errorMessage ?? null
    this.createdAt = params.createdAt
  }

  public toJSON(): ReplayJson {
    return {
      id: this.id,
      originHash: this.originHash,
      originChain: this.originChain,
      replayChain: this.replayChain,
      decoded: {
        ...this.decoded,
        value: this.decoded.value.toString(),
        args: this.decoded.args.map(a => ({ ...a }))
      },
      replayHash: this.replayHash,
      status: this.status,
      errorMessage: this.errorMessage,
      createdAtIso: this.createdAt.toISOString()
    }
  }

  public static fromJSON(j: ReplayJson): Replay {
    return new Replay({
      id: j.id,
      originHash: j.originHash,
      originChain: j.originChain,
      replayChain: j.replayChain as Chain,
      decoded: {
        ...j.decoded,
        value: BigInt(j.decoded.value),
        args: j.decoded.args
      },
      replayHash: j.replayHash,
      status: j.status,
      errorMessage: j.errorMessage,
      createdAt: new Date(j.createdAtIso)
    })
  }
}

type ReplayOriginChain = "ethereum" | "polygon" | "base"

type ReplayJson = {
  id: string
  originHash: string
  originChain: ReplayOriginChain
  replayChain: string
  decoded: Omit<DecodedTx, "value" | "args"> & {
    value: string
    args: ReadonlyArray<DecodedArg>
  }
  replayHash: string | null
  status: ReplayStatus
  errorMessage: string | null
  createdAtIso: string
}

export default Replay
export type { DecodedTx, DecodedArg, ReplayStatus, ReplayOriginChain, ReplayJson }
