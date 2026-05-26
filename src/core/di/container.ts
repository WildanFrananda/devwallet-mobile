import "reflect-metadata"
import { configureDI as configureMvvmDI, getContainer } from "react-native-mobile-mvvm/di"
import KeyringService from "../crypto/keyring/keyring.service"
import KeychainService from "../storage/keychain.service"
import WalletRepositoryImpl from "../../repositories/wallet.repository.impl"
import AutoLockService from "../lifecycle/auto-lock.service"
import BalanceDatasource from "../../datasources/balance/balance.datasource"
import TokenDatasource from "../../datasources/token/token.datasource"
import { Tokens } from "./tokens"

class DIContainer {
  private static configured = false

  public static configure(): void {
    if (DIContainer.configured) return
    configureMvvmDI(() => {
      getContainer.registerSingleton(Tokens.KeyringService, KeyringService)
      getContainer.registerSingleton(Tokens.Keychain, KeychainService)
      getContainer.registerSingleton(Tokens.BalanceDatasource, BalanceDatasource)
      getContainer.registerSingleton(Tokens.TokenDatasource, TokenDatasource)
      getContainer.registerSingleton(Tokens.WalletRepository, WalletRepositoryImpl)
      getContainer.registerSingleton(Tokens.AutoLock, AutoLockService)
    })
    DIContainer.configured = true
  }

  public static get instance(): typeof getContainer {
    return getContainer
  }
}

export default DIContainer
