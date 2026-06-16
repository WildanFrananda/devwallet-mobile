import "reflect-metadata"
import { Subject } from "rxjs"
import ContractTerminalViewModel from "../src/viewmodels/ContractTerminalViewModel"
import Contract from "../src/models/contract.model"
import Account from "../src/models/account.model"
import { Chain } from "../src/core/constants/chains.enum"
import type ContractRepository from "../src/repositories/contract.repository"
import type ContractCallerDatasource from "../src/datasources/contract/contract-caller.datasource"
import type WalletRepository from "../src/repositories/wallet.repository"

function makeContract(): Contract {
  return new Contract({
    id: "evm:sepolia:0xabc",
    chain: Chain.EVM_SEPOLIA,
    address: "0xabc",
    name: "Test",
    abiKind: "evm",
    rawAbi: "[]",
    functions: [
      {
        name: "balanceOf",
        inputs: [{ name: "owner", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view"
      },
      {
        name: "transfer",
        inputs: [
          { name: "to", type: "address" },
          { name: "amount", type: "uint256" }
        ],
        outputs: [],
        stateMutability: "nonpayable"
      }
    ],
    savedAt: new Date()
  })
}

function makeRepo(): {
  repo: ContractRepository
  stream: Subject<Contract[]>
  save: jest.Mock
  deleteFn: jest.Mock
  } {
  const stream = new Subject<Contract[]>()
  const save = jest.fn(() => makeContract())
  const deleteFn = jest.fn()
  const repo = {
    save,
    list: jest.fn(() => []),
    delete: deleteFn,
    stream$: () => stream.asObservable()
  } as unknown as ContractRepository
  return { repo, stream, save, deleteFn }
}

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

describe("ContractTerminalViewModel", () => {
  it("setAddField updates form values", () => {
    const { repo } = makeRepo()
    const caller = {} as ContractCallerDatasource
    const wallet = {} as WalletRepository
    const vm = new ContractTerminalViewModel(repo, caller, wallet)
    vm.setAddField("address", "0xnew")
    vm.setAddField("name", "Token")
    expect(vm.addForm$.value.address).toBe("0xnew")
    expect(vm.addForm$.value.name).toBe("Token")
  })

  it("select() updates selected + clears outcome", () => {
    const { repo } = makeRepo()
    const vm = new ContractTerminalViewModel(repo, {} as never, {} as never)
    vm.select(makeContract())
    expect(vm.selected$.value?.id).toBe("evm:sepolia:0xabc")
    vm.select(null)
    expect(vm.selected$.value).toBeNull()
  })

  it("submitAdd success saves + resets form", () => {
    const { repo, save } = makeRepo()
    save.mockReturnValue(makeContract())
    const vm = new ContractTerminalViewModel(repo, {} as never, {} as never)
    vm.setAddField("address", "0xabc")
    vm.setAddField("rawAbi", "[]")
    vm.submitAdd()
    expect(save).toHaveBeenCalled()
    expect(vm.addState$.value.status).toBe("success")
  })

  it("submitAdd error surfaces", () => {
    const { repo, save } = makeRepo()
    save.mockImplementation(() => {
      throw new Error("invalid abi")
    })
    const vm = new ContractTerminalViewModel(repo, {} as never, {} as never)
    vm.setAddField("rawAbi", "bad")
    vm.submitAdd()
    expect(vm.addState$.value.status).toBe("error")
  })

  it("deleteContract delegates + clears selected when match", () => {
    const { repo, deleteFn } = makeRepo()
    const contract = makeContract()
    const vm = new ContractTerminalViewModel(repo, {} as never, {} as never)
    vm.select(contract)
    vm.deleteContract(contract.id)
    expect(deleteFn).toHaveBeenCalledWith(contract.id)
    expect(vm.selected$.value).toBeNull()
  })

  it("setArg + callFunction (read) routes to caller.call", async () => {
    const { repo } = makeRepo()
    const callResult = { value: 1000n }
    const caller = {
      call: jest.fn(async () => callResult),
      send: jest.fn()
    } as unknown as jest.Mocked<ContractCallerDatasource>
    const wallet = {} as WalletRepository
    const contract = makeContract()
    const vm = new ContractTerminalViewModel(repo, caller, wallet)
    vm.select(contract)
    vm.setArg("balanceOf", 0, "0xowner")
    vm.callFunction(contract.functions[0]!)
    await flush()
    expect(caller.call).toHaveBeenCalled()
    expect(vm.callOutcome$.value.kind).toBe("result")
  })

  it("callFunction (write) derives account + routes to caller.send", async () => {
    const { repo } = makeRepo()
    const caller = {
      call: jest.fn(),
      send: jest.fn(async () => ({ txHash: "0xtx" }))
    } as unknown as jest.Mocked<ContractCallerDatasource>
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
    const contract = makeContract()
    const vm = new ContractTerminalViewModel(repo, caller, wallet)
    vm.select(contract)
    vm.setArg("transfer", 0, "0xto")
    vm.setArg("transfer", 1, "1000")
    vm.callFunction(contract.functions[1]!)
    await flush()
    expect(wallet.derive).toHaveBeenCalled()
    expect(caller.send).toHaveBeenCalled()
    expect(vm.callOutcome$.value.kind).toBe("tx")
  })

  it("callFunction error surfaces", async () => {
    const { repo } = makeRepo()
    const caller = {
      call: jest.fn(async () => {
        throw new Error("rpc")
      }),
      send: jest.fn()
    } as unknown as jest.Mocked<ContractCallerDatasource>
    const contract = makeContract()
    const vm = new ContractTerminalViewModel(repo, caller, {} as never)
    vm.select(contract)
    vm.callFunction(contract.functions[0]!)
    await flush()
    expect(vm.callOutcome$.value.kind).toBe("error")
  })
})
