import { type JSX } from "react"
import { View, Text, TextInput, Button, StyleSheet, ScrollView, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useScopedViewModel, useStream } from "react-native-mobile-mvvm"
import OnboardingViewModel from "../viewmodels/OnboardingViewModel"

function VerifyMnemonicScreen(): JSX.Element {
  const vm = useScopedViewModel(OnboardingViewModel)
  const challenge = useStream(vm.verify$, vm.verify$.value)
  const answers = useStream(vm.verifyAnswers$, vm.verifyAnswers$.value)
  const persist = useStream(vm.persist$, vm.persist$.value)

  if (!challenge) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.center}>
          <Text style={styles.body}>No verification challenge active. Go back and generate a mnemonic first.</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Verify backup</Text>
        <Text style={styles.subtitle}>Type the word at each position from your written phrase.</Text>

        {challenge.indices.map((wordIndex, slot) => (
          <View key={wordIndex} style={styles.row}>
            <Text style={styles.label}>Word #{wordIndex + 1}</Text>
            <TextInput
              style={styles.input}
              value={answers[slot] ?? ""}
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={text => vm.setVerifyAnswer(slot, text)}
              placeholder="enter word"
            />
          </View>
        ))}

        {persist.status === "loading" && <ActivityIndicator />}

        {persist.status === "error" && <Text style={styles.error}>{persist.message}</Text>}

        {persist.status === "success" && (
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>Wallet ready</Text>
            <Text style={styles.body}>Primary EVM address:</Text>
            <Text style={styles.mono}>{persist.data.address}</Text>
          </View>
        )}

        <Button title="Verify" onPress={() => vm.submitVerify(false)} disabled={persist.status === "loading"} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 20, gap: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  title: { fontSize: 22, fontWeight: "600" },
  subtitle: { fontSize: 14, opacity: 0.7 },
  row: { gap: 4 },
  label: { fontSize: 12, opacity: 0.6 },
  input: {
    padding: 12,
    backgroundColor: "#F2F2F7",
    borderRadius: 8,
    fontSize: 16
  },
  body: { fontSize: 13, opacity: 0.7 },
  error: { color: "#B00020", fontSize: 13 },
  mono: { fontFamily: "Courier", fontSize: 12 },
  successBox: { padding: 12, backgroundColor: "#E6F4EA", borderRadius: 8, gap: 4 },
  successTitle: { fontSize: 16, fontWeight: "700" }
})

export default VerifyMnemonicScreen
