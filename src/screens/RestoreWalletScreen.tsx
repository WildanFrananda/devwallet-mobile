import { type JSX } from "react"
import { View, Text, TextInput, Button, StyleSheet, ScrollView, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { useScopedViewModel, useStream, useEvent } from "react-native-mobile-mvvm"
import OnboardingViewModel from "../viewmodels/OnboardingViewModel"

type OnboardingNav = NativeStackNavigationProp<{
  GenerateWallet: undefined
  RestoreWallet: undefined
  VerifyMnemonic: undefined
  CreatePin: undefined
}>

function RestoreWalletScreen(): JSX.Element {
  const vm = useScopedViewModel(OnboardingViewModel)
  const nav = useNavigation<OnboardingNav>()
  const phrase = useStream(vm.restoreInput$, vm.restoreInput$.value)
  const wordCount = useStream(vm.restoreWordCount$, vm.restoreWordCount$.value)
  const valid = useStream(vm.restoreValid$, vm.restoreValid$.value)
  const persist = useStream(vm.persist$, vm.persist$.value)

  useEvent(vm.navigate$, event => {
    if (event === "createPin") nav.navigate("CreatePin")
  })

  const canSubmit = valid && persist.status !== "loading"

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Restore wallet</Text>
        <Text style={styles.subtitle}>Paste or type your 12- or 24-word recovery phrase, separated by spaces.</Text>

        <TextInput
          style={styles.input}
          value={phrase}
          onChangeText={vm.setRestoreInput.bind(vm)}
          placeholder="word1 word2 word3 ..."
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text style={styles.counter}>
          {wordCount} word{wordCount === 1 ? "" : "s"}
          {wordCount > 0 && !valid ? " — need 12 or 24" : ""}
        </Text>

        {persist.status === "loading" && <ActivityIndicator />}

        {persist.status === "error" && <Text style={styles.error}>{persist.message}</Text>}

        {persist.status === "success" && (
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>Wallet restored</Text>
            <Text style={styles.body}>Primary EVM address:</Text>
            <Text style={styles.mono}>{persist.data.address}</Text>
          </View>
        )}

        <Button title="Restore wallet" onPress={() => vm.submitRestore(false)} disabled={!canSubmit} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 20, gap: 14 },
  title: { fontSize: 22, fontWeight: "600" },
  subtitle: { fontSize: 14, opacity: 0.7 },
  input: {
    padding: 12,
    backgroundColor: "#F2F2F7",
    borderRadius: 8,
    fontSize: 16,
    minHeight: 110
  },
  counter: { fontSize: 12, opacity: 0.6 },
  body: { fontSize: 13, opacity: 0.7 },
  error: { color: "#B00020", fontSize: 13 },
  mono: { fontFamily: "Courier", fontSize: 12 },
  successBox: { padding: 12, backgroundColor: "#E6F4EA", borderRadius: 8, gap: 4 },
  successTitle: { fontSize: 16, fontWeight: "700" }
})

export default RestoreWalletScreen
