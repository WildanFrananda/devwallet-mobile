import "reflect-metadata"
import NftGalleryViewModel from "../src/viewmodels/NftGalleryViewModel"
import Nft from "../src/models/nft.model"
import Account from "../src/models/account.model"
import { Chain } from "../src/core/constants/chains.enum"
import type WalletRepository from "../src/repositories/wallet.repository"
import type NftDatasource from "../src/datasources/nft/nft.datasource"

function makeAccount(chain: Chain): Account {
  return new Account({
    chain,
    address: `0x${chain}`,
    privateKey: "0xpriv",
    publicKey: "0xpub",
    path: "m",
    index: 0
  })
}

function makeNft(chain: Chain, id: string): Nft {
  return new Nft({
    chain,
    contractAddress: "0xcontract",
    tokenId: id,
    name: `NFT ${id}`
  })
}

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

describe("NftGalleryViewModel", () => {
  it("refresh fetches per supported chain + merges results", async () => {
    const wallet = {
      deriveAll: jest.fn(async () => [
        makeAccount(Chain.EVM_SEPOLIA),
        makeAccount(Chain.SOLANA_DEVNET),
        makeAccount(Chain.BITCOIN_TESTNET)
      ])
    } as unknown as WalletRepository
    const nfts = {
      fetch: jest.fn(async (chain: Chain) => {
        if (chain === Chain.EVM_SEPOLIA) return [makeNft(chain, "1")]
        if (chain === Chain.SOLANA_DEVNET) return [makeNft(chain, "2")]
        return []
      })
    } as unknown as jest.Mocked<NftDatasource>
    const vm = new NftGalleryViewModel(wallet, nfts)
    vm.refresh()
    expect(vm.state$.value.status).toBe("loading")
    await flush()
    const state = vm.state$.value
    expect(state.status).toBe("success")
    if (state.status === "success") expect(state.data).toHaveLength(2)
  })

  it("partial failure does not blank the whole list", async () => {
    const wallet = {
      deriveAll: jest.fn(async () => [makeAccount(Chain.EVM_SEPOLIA), makeAccount(Chain.SOLANA_DEVNET)])
    } as unknown as WalletRepository
    const nfts = {
      fetch: jest.fn(async (chain: Chain) => {
        if (chain === Chain.EVM_SEPOLIA) return [makeNft(chain, "ok")]
        throw new Error("solana down")
      })
    } as unknown as jest.Mocked<NftDatasource>
    const vm = new NftGalleryViewModel(wallet, nfts)
    vm.refresh()
    await flush()
    const state = vm.state$.value
    expect(state.status).toBe("success")
    if (state.status === "success") expect(state.data).toHaveLength(1)
  })

  it("deriveAll error surfaces as error state", async () => {
    const wallet = {
      deriveAll: jest.fn(async () => {
        throw new Error("keyring locked")
      })
    } as unknown as WalletRepository
    const nfts = { fetch: jest.fn() } as unknown as NftDatasource
    const vm = new NftGalleryViewModel(wallet, nfts)
    vm.refresh()
    await flush()
    expect(vm.state$.value.status).toBe("error")
  })
})
