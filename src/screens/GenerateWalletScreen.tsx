import React from "react"
import { View, Text, Button, ActivityIndicator, StyleSheet } from "react-native"
import { useViewModel, useUiState } from "react-native-mobile-mvvm"
import OnboardingViewModel from "../viewmodels/OnboardingViewModel"

function GenerateWalletScreen() {
  const vm = useViewModel(OnboardingViewModel)
  const { isLoading, isSuccess, isError, error } = useUiState(vm.walletState$)

  return (
    <View style={styles.center}>
      <Text style={styles.title}>Generate Wallet</Text>
      {isLoading && <ActivityIndicator />}
      {isError && <Text style={styles.error}>{error}</Text>}
      {isSuccess && <Text>Wallet draft ready (placeholder)</Text>}
      <Button title="Generate" onPress={() => vm.generateMnemonic()} />
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 16 },
  title: { fontSize: 22, fontWeight: "600" },
  error: { color: "red" }
})

export default GenerateWalletScreen
