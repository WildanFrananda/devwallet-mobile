import { type JSX } from "react"
import { View, Text, StyleSheet, ActivityIndicator } from "react-native"
import useBiometric from "../hooks/useBiometric"

type Props = {
  message?: string
}

function biometryLabel(type: string | null): string {
  if (type === "FaceID") return "Face ID"
  if (type === "TouchID") return "Touch ID"
  if (type === "Fingerprint") return "Fingerprint"
  if (type === "OpticID") return "Optic ID"
  if (type === "Face") return "Face Unlock"
  return "biometric"
}

function BiometricPrompt({ message = "Unlock to continue" }: Props): JSX.Element {
  const { loading, available, type } = useBiometric()

  if (loading) {
    return (
      <View style={styles.box}>
        <ActivityIndicator />
      </View>
    )
  }

  if (!available) {
    return (
      <View style={styles.box}>
        <Text style={styles.title}>Biometric not available</Text>
        <Text style={styles.body}>Device passcode fallback will be used.</Text>
      </View>
    )
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>{biometryLabel(type)}</Text>
      <Text style={styles.body}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  box: { padding: 16, gap: 6, alignItems: "center" },
  title: { fontSize: 16, fontWeight: "600" },
  body: { fontSize: 13, opacity: 0.7, textAlign: "center" }
})

export default BiometricPrompt
