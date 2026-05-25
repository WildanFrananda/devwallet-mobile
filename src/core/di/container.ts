import "reflect-metadata"
import { configureDI as configureMvvmDI, getContainer } from "react-native-mobile-mvvm/di"

let configured = false

function configureDI(): void {
  if (configured) return
  configureMvvmDI(() => {
    // Phase 1+ registrations go here, e.g.:
    //   container.registerSingleton(Tokens.KeyringService, KeyringService)
    //   container.register(Tokens.WalletRepository, { useClass: WalletRepositoryImpl })
  })
  configured = true
}

export { getContainer, configureDI }
