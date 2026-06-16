import "reflect-metadata"
import { Subject } from "rxjs"
import TxReplayViewModel from "../src/viewmodels/TxReplayViewModel"
import Replay, { type DecodedTx } from "../src/models/replay.model"
import Account from "../src/models/account.model"
import { Chain } from "../src/core/constants/chains.enum"
import type ReplayDecoderDatasource from "../src/datasources/replay/replay-decoder.datasource"
import type ReplayExecutorDatasource from "../src/datasources/replay/replay-executor.datasource"
import type ReplayRepository from "../src/repositories/replay.repository"
import type WalletRepository from "../src/repositories/wallet.repository"

function makeDecoded(): DecodedTx {
  return {
    hash: "0xhash",
    from: "0xfrom",
    to: "0xto",
    value: 0n,
    input: "0xa9059cbb",
    functionName: "transfer",
    args: [{ name: "to", type: "address", value: "0xdead" }],
    matchedAbi: "common"
  }
}

function makeRepo(): {
  repo: ReplayRepository
  stream: Subject<Replay[]>
  save: jest.Mock
  deleteFn: jest.Mock
  getFn: jest.Mock
  } {
  const stream = new Subject<Replay[]>()
  const save = jest.fn()
  const deleteFn = jest.fn()
  const getFn = jest.fn()
  const repo = {
    save,
    list: jest.fn(() => []),
    delete: deleteFn,
    get: getFn,
    stream$: () => stream.asObservable()
  } as unknown as ReplayRepository
  return { repo, stream, save, deleteFn, getFn }
}

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

describe("TxReplayViewModel", () => {
  it("setOrigin snaps replay chain to paired testnet", () => {
    const { repo } = makeRepo()
    const vm = new TxReplayViewModel({} as never, {} as never, repo, {} as never)
    vm.setOrigin("polygon")
    expect(vm.origin$.value).toBe("polygon")
    expect(vm.replayChain$.value).toBe(Chain.EVM_POLYGON_AMOY)
  })

  it("fetchAndDecode rejects empty hash", () => {
    const { repo } = makeRepo()
    const vm = new TxReplayViewModel({} as never, {} as never, repo, {} as never)
    vm.fetchAndDecode()
    expect(vm.decoded$.value.status).toBe("error")
  })

  it("fetchAndDecode success populates decoded$", async () => {
    const { repo } = makeRepo()
    const decoder = {
      fetchAndDecode: jest.fn(async () => makeDecoded())
    } as unknown as jest.Mocked<ReplayDecoderDatasource>
    const vm = new TxReplayViewModel(decoder, {} as never, repo, {} as never)
    vm.setInputHash("0xanything")
    vm.fetchAndDecode()
    await flush()
    expect(decoder.fetchAndDecode).toHaveBeenCalled()
    expect(vm.decoded$.value.status).toBe("success")
  })

  it("fetchAndDecode error surfaces", async () => {
    const { repo } = makeRepo()
    const decoder = {
      fetchAndDecode: jest.fn(async () => {
        throw new Error("not found")
      })
    } as unknown as jest.Mocked<ReplayDecoderDatasource>
    const vm = new TxReplayViewModel(decoder, {} as never, repo, {} as never)
    vm.setInputHash("0xfake")
    vm.fetchAndDecode()
    await flush()
    expect(vm.decoded$.value.status).toBe("error")
  })

  it("executeReplay requires decoded first", () => {
    const { repo } = makeRepo()
    const vm = new TxReplayViewModel({} as never, {} as never, repo, {} as never)
    vm.executeReplay()
    expect(vm.replayState$.value.status).toBe("error")
  })

  it("executeReplay success persists Replay row", async () => {
    const { repo, save } = makeRepo()
    const decoder = {
      fetchAndDecode: jest.fn(async () => makeDecoded())
    } as unknown as jest.Mocked<ReplayDecoderDatasource>
    const executor = {
      execute: jest.fn(async () => ({ hash: "0xreplay" }))
    } as unknown as jest.Mocked<ReplayExecutorDatasource>
    const wallet = {
      derive: jest.fn(async () =>
        new Account({
          chain: Chain.EVM_SEPOLIA,
          address: "0xme",
          privateKey: "0xkey",
          publicKey: "0xpub",
          path: "m",
          index: 0
        })
      )
    } as unknown as jest.Mocked<WalletRepository>
    const vm = new TxReplayViewModel(decoder, executor, repo, wallet)
    vm.setInputHash("0xany")
    vm.fetchAndDecode()
    await flush()
    vm.executeReplay()
    await flush()
    expect(executor.execute).toHaveBeenCalled()
    expect(save).toHaveBeenCalled()
    expect(vm.replayState$.value.status).toBe("success")
  })

  it("deleteReplay forwards to repo", () => {
    const { repo, deleteFn } = makeRepo()
    const vm = new TxReplayViewModel({} as never, {} as never, repo, {} as never)
    vm.deleteReplay("id-1")
    expect(deleteFn).toHaveBeenCalledWith("id-1")
  })

  it("reloadFromHistory restores form from saved replay", () => {
    const { repo, getFn } = makeRepo()
    getFn.mockReturnValue(
      new Replay({
        id: "r-1",
        originHash: "0xhash",
        originChain: "polygon",
        replayChain: Chain.EVM_POLYGON_AMOY,
        decoded: makeDecoded(),
        status: "broadcast",
        createdAt: new Date()
      })
    )
    const vm = new TxReplayViewModel({} as never, {} as never, repo, {} as never)
    vm.reloadFromHistory("r-1")
    expect(vm.origin$.value).toBe("polygon")
    expect(vm.inputHash$.value).toBe("0xhash")
    expect(vm.decoded$.value.status).toBe("success")
  })
})
