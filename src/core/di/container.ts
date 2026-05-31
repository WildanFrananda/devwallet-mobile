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
import DeviceFingerprintService from "../auth/device-fingerprint.service"
import SecureStorageService from "../auth/secure-storage.service"
import V03EncryptMigration from "../migration/v0.3-encrypt.migration"
import PushService from "../notifications/push.service"
import FaucetDatasource from "../../datasources/faucet/faucet.datasource"
import FaucetRepositoryImpl from "../../repositories/faucet.repository.impl"
import FeeDatasource from "../../datasources/fee/fee.datasource"
import RpcLogRepositoryImpl from "../../repositories/rpc-log.repository.impl"
import RpcLogSink from "../network/rpc-log.sink"
import ContractRepositoryImpl from "../../repositories/contract.repository.impl"
import ContractCallerDatasource from "../../datasources/contract/contract-caller.datasource"
import GasOracleDatasource from "../../datasources/gas/gas-oracle.datasource"
import GasRepositoryImpl from "../../repositories/gas.repository.impl"
import GasHistoryRepositoryImpl from "../../repositories/gas-history.repository.impl"
import RpcReplayDatasource from "../../datasources/rpc-replay/rpc-replay.datasource"
import ReplayDecoderDatasource from "../../datasources/replay/replay-decoder.datasource"
import ReplayExecutorDatasource from "../../datasources/replay/replay-executor.datasource"
import ReplayRepositoryImpl from "../../repositories/replay.repository.impl"
import WebhookDatasource from "../../datasources/webhook/webhook.datasource"
import WebhookRepositoryImpl from "../../repositories/webhook.repository.impl"
import NftDatasource from "../../datasources/nft/nft.datasource"
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
      getContainer.registerSingleton(Tokens.DeviceFingerprint, DeviceFingerprintService)
      getContainer.registerSingleton(Tokens.SecureStorage, SecureStorageService)
      getContainer.registerSingleton(Tokens.V03EncryptMigration, V03EncryptMigration)
      getContainer.registerSingleton(Tokens.Push, PushService)
      getContainer.registerSingleton(Tokens.BalanceDatasource, BalanceDatasource)
      getContainer.registerSingleton(Tokens.TokenDatasource, TokenDatasource)
      getContainer.registerSingleton(Tokens.TxHistoryDatasource, TxHistoryDatasource)
      getContainer.registerSingleton(Tokens.SignerDatasource, SignerDatasource)
      getContainer.registerSingleton(Tokens.WalletRepository, WalletRepositoryImpl)
      getContainer.registerSingleton(Tokens.AutoLock, AutoLockService)
      getContainer.registerSingleton(Tokens.FaucetDatasource, FaucetDatasource)
      getContainer.registerSingleton(Tokens.FaucetRepository, FaucetRepositoryImpl)
      getContainer.registerSingleton(Tokens.FeeDatasource, FeeDatasource)
      getContainer.registerSingleton(Tokens.RpcLogRepository, RpcLogRepositoryImpl)
      getContainer.registerSingleton(Tokens.ContractRepository, ContractRepositoryImpl)
      getContainer.registerSingleton(Tokens.ContractCallerDatasource, ContractCallerDatasource)
      getContainer.registerSingleton(Tokens.GasOracleDatasource, GasOracleDatasource)
      getContainer.registerSingleton(Tokens.GasRepository, GasRepositoryImpl)
      getContainer.registerSingleton(Tokens.GasHistoryRepository, GasHistoryRepositoryImpl)
      getContainer.registerSingleton(Tokens.RpcReplayDatasource, RpcReplayDatasource)
      getContainer.registerSingleton(Tokens.ReplayDecoderDatasource, ReplayDecoderDatasource)
      getContainer.registerSingleton(Tokens.ReplayExecutorDatasource, ReplayExecutorDatasource)
      getContainer.registerSingleton(Tokens.ReplayRepository, ReplayRepositoryImpl)
      getContainer.registerSingleton(Tokens.WebhookDatasource, WebhookDatasource)
      getContainer.registerSingleton(Tokens.WebhookRepository, WebhookRepositoryImpl)
      getContainer.registerSingleton(Tokens.NftDatasource, NftDatasource)
    })
    // Resolve the log repo once so the transport sink has a live target
    // before any RPC call fires. Subsequent resolutions hit the same
    // singleton instance.
    RpcLogSink.register(getContainer.resolve<RpcLogRepositoryImpl>(Tokens.RpcLogRepository))
    DIContainer.configured = true
  }

  public static get instance(): typeof getContainer {
    return getContainer
  }
}

export default DIContainer
