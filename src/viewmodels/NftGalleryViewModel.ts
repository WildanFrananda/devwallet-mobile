import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import { StateFlow, UiState, ViewModel } from "react-native-mobile-mvvm"
import { Chain } from "../core/constants/chains.enum"
import { Tokens } from "../core/di/tokens"
import Nft from "../models/nft.model"
import type WalletRepository from "../repositories/wallet.repository"
import type NftDatasource from "../datasources/nft/nft.datasource"

const NFT_CHAINS: ReadonlyArray<Chain> = [
  Chain.EVM_SEPOLIA,
  Chain.EVM_POLYGON_AMOY,
  Chain.EVM_BASE_SEPOLIA,
  Chain.SOLANA_DEVNET
]

@Injectable()
class NftGalleryViewModel extends ViewModel {
  private readonly _state = new StateFlow<UiState<ReadonlyArray<Nft>>>(UiState.idle())
  public readonly state$ = this._state.asReadOnly()

  public constructor(
    @Inject(Tokens.WalletRepository) private readonly wallet: WalletRepository,
    @Inject(Tokens.NftDatasource) private readonly nfts: NftDatasource
  ) {
    super()
  }

  public refresh(): void {
    if (this._state.value.status !== "success") {
      this._state.value = UiState.loading()
    }
    void this.launch(async signal => {
      try {
        const accounts = await this.wallet.deriveAll(0)
        if (signal.aborted) return
        const targets = accounts.filter(a => NFT_CHAINS.includes(a.chain))
        const settled = await Promise.allSettled(
          targets.map(a => this.nfts.fetch(a.chain, a.address))
        )
        if (signal.aborted) return
        const merged: Nft[] = []
        for (const result of settled) {
          if (result.status === "fulfilled") {
            for (const nft of result.value) merged.push(nft)
          }
        }
        this._state.value = UiState.success(merged)
      } catch (err) {
        if (signal.aborted) return
        if (this._state.value.status !== "success") {
          this._state.value = UiState.error(err instanceof Error ? err.message : String(err))
        }
      }
    })
  }
}

export default NftGalleryViewModel
