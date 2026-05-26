import "reflect-metadata"
import { configureDI as configureMvvmDI, getContainer } from "react-native-mobile-mvvm/di"

class DIContainer {
  private static configured = false

  public static configure(): void {
    if (DIContainer.configured) return
    configureMvvmDI(() => {
      // Phase 1+ registrations go here, e.g.:
      //   container.registerSingleton(Tokens.KeyringService, KeyringService)
      //   container.register(Tokens.WalletRepository, { useClass: WalletRepositoryImpl })
    })
    DIContainer.configured = true
  }

  public static get instance(): typeof getContainer {
    return getContainer
  }
}

export default DIContainer
