import "reflect-metadata"
import { configureDI as configureMvvmDI, getContainer } from "react-native-mobile-mvvm/di"
import KeyringService from "../crypto/keyring/keyring.service"
import { Tokens } from "./tokens"

class DIContainer {
  private static configured = false

  public static configure(): void {
    if (DIContainer.configured) return
    configureMvvmDI(() => {
      getContainer.registerSingleton(Tokens.KeyringService, KeyringService)
    })
    DIContainer.configured = true
  }

  public static get instance(): typeof getContainer {
    return getContainer
  }
}

export default DIContainer
