import { useEffect, useState } from "react"
import * as Keychain from "react-native-keychain"

type BiometricCapability = {
  loading: boolean
  available: boolean
  type: Keychain.BIOMETRY_TYPE | null
}

/**
 * Reports whether the device exposes biometric unlock (Face ID / Touch ID
 * / fingerprint). Reads `react-native-keychain.getSupportedBiometryType`
 * once on mount.
 */
function useBiometric(): BiometricCapability {
  const [state, setState] = useState<BiometricCapability>({
    loading: true,
    available: false,
    type: null
  })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const type = await Keychain.getSupportedBiometryType()
        if (cancelled) return
        setState({ loading: false, available: type !== null, type })
      } catch {
        if (cancelled) return
        setState({ loading: false, available: false, type: null })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}

export default useBiometric
export type { BiometricCapability }
