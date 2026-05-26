import { type JSX } from "react"
import { View, Text, Button, StyleSheet, ScrollView, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { useScopedViewModel, useStream, useEvent } from "react-native-mobile-mvvm"
import OnboardingViewModel from "../viewmodels/OnboardingViewModel"
import MnemonicGrid from "../components/MnemonicGrid"

type OnboardingNav = NativeStackNavigationProp<{
  GenerateWallet: undefined
  RestoreWallet: undefined
  VerifyMnemonic: undefined
}>

function GenerateWalletScreen(): JSX.Element {
  const vm = useScopedViewModel(OnboardingViewModel)
  const nav = useNavigation<OnboardingNav>()
  const mnemonicState = useStream(vm.mnemonic$, vm.mnemonic$.value)

  useEvent(vm.navigate$, event => {
    if (event === "verify") nav.navigate("VerifyMnemonic")
  })

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Generate wallet</Text>
        <Text style={styles.subtitle}>
          Write down these 12 words. Keep them offline — anyone with this phrase owns the wallet.
        </Text>

        {mnemonicState.status === "idle" && (
          <View style={styles.actions}>
            <Button title="Generate 12-word phrase" onPress={() => vm.generate(128)} />
            <Button title="Restore from existing phrase" onPress={() => nav.navigate("RestoreWallet")} />
          </View>
        )}

        {mnemonicState.status === "loading" && <ActivityIndicator />}

        {mnemonicState.status === "error" && <Text style={styles.error}>{mnemonicState.message}</Text>}

        {mnemonicState.status === "success" && (
          <>
            <MnemonicGrid words={mnemonicState.data} />
            <View style={styles.actions}>
              <Button title="Regenerate" onPress={() => vm.generate(128)} />
              <Button title="I've written it down" onPress={() => vm.prepareVerify()} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 20, gap: 16 },
  title: { fontSize: 22, fontWeight: "600" },
  subtitle: { fontSize: 14, opacity: 0.7 },
  actions: { gap: 8 },
  error: { color: "#B00020", fontSize: 13 }
})

export default GenerateWalletScreen
