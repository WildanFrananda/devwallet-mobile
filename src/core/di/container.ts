import "reflect-metadata"
import { configureDI as configureMvvmDI, getContainer } from "react-native-mobile-mvvm/di"
import KeyringService from "../crypto/keyring/keyring.service"
import KeychainService from "../storage/keychain.service"
import SettingsService from "../storage/settings.service"
import WalletRepositoryImpl from "../../repositories/wallet.repository.impl"
import AutoLockService from "../lifecycle/auto-lock.service"
import BalanceDatasource from "../../datasources/balance/balance.datasource"
import TokenDatasource from "../../datasources/token/token.datasource"
import TxHistoryDatasource from "../../datasources/tx-history/tx-history.datasource"
import SignerDatasource from "../../datasources/signer/signer.datasource"
import PinService from "../auth/pin.service"
import DeviceBindingService from "../auth/device-binding.service"
import { Tokens } from "./tokens"

class DIContainer {
  private static configured = false

  public static configure(): void {
    if (DIContainer.configured) return
    configureMvvmDI(() => {
      getContainer.registerSingleton(Tokens.KeyringService, KeyringService)
      getContainer.registerSingleton(Tokens.Keychain, KeychainService)
      getContainer.registerSingleton(Tokens.Settings, SettingsService)
      getContainer.registerSingleton(Tokens.Pin, PinService)
      getContainer.registerSingleton(Tokens.DeviceBinding, DeviceBindingService)
      getContainer.registerSingleton(Tokens.BalanceDatasource, BalanceDatasource)
      getContainer.registerSingleton(Tokens.TokenDatasource, TokenDatasource)
      getContainer.registerSingleton(Tokens.TxHistoryDatasource, TxHistoryDatasource)
      getContainer.registerSingleton(Tokens.SignerDatasource, SignerDatasource)
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
