import { useEffect, useState, type JSX } from "react"
import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import DeviceInfo from "react-native-device-info"
import Config from "react-native-config"
import { useViewModel, useStream } from "react-native-mobile-mvvm"
import SettingsViewModel from "../viewmodels/SettingsViewModel"
import { AUTO_LOCK_CHOICES } from "../core/storage/settings.service"
import type { AppStackParamList } from "../navigation/AppNavigator"

type AppNav = NativeStackNavigationProp<AppStackParamList>

function SettingsScreen(): JSX.Element {
  const insets = useSafeAreaInsets()
  const nav = useNavigation<AppNav>()
  const vm = useViewModel(SettingsViewModel)
  const autoLockMs = useStream(vm.autoLockMs$, vm.autoLockMs$.value)
  const useBiometric = useStream(vm.useBiometric$, vm.useBiometric$.value)
  const [version, setVersion] = useState<string>("…")
  const [buildNumber, setBuildNumber] = useState<string>("…")

  useEffect(() => {
    setVersion(DeviceInfo.getVersion())
    setBuildNumber(DeviceInfo.getBuildNumber())
  }, [])

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.headerBar}>
        <Text style={styles.title}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.sectionLabel}>Security</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Use biometric</Text>
            <Switch value={useBiometric} onValueChange={v => vm.setUseBiometric(v)} />
          </View>
          <Text style={styles.rowHint}>
            When off, the app uses your PIN to unlock. Biometric is recommended where available.
          </Text>

          <Pressable style={styles.actionRow} onPress={() => nav.navigate("ChangePin")}>
            <Text style={styles.rowLabel}>Change PIN</Text>
            <Text style={styles.actionChevron}>›</Text>
          </Pressable>

          <Pressable style={styles.actionRow} onPress={() => vm.lockNow()}>
            <Text style={[styles.rowLabel, styles.dangerLabel]}>Lock now</Text>
            <Text style={[styles.actionChevron, styles.dangerLabel]}>›</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>Auto-lock</Text>
        <View style={styles.section}>
          {AUTO_LOCK_CHOICES.map(choice => {
            const selected = choice.ms === autoLockMs
            return (
              <Pressable key={choice.label} style={styles.choice} onPress={() => vm.setAutoLockMs(choice.ms)}>
                <Text style={styles.choiceLabel}>{choice.label}</Text>
                {selected && <Text style={styles.choiceCheck}>✓</Text>}
              </Pressable>
            )
          })}
          <Text style={styles.rowHint}>Wallet locks after the app stays in background for this long.</Text>
        </View>

        <Text style={styles.sectionLabel}>About</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>App version</Text>
            <Text style={styles.rowValue}>
              {version} ({buildNumber})
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>React Native</Text>
            <Text style={styles.rowValue}>0.85.3</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Commit</Text>
            <Text style={styles.rowValue}>{Config.GIT_COMMIT || "dev"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Phase</Text>
            <Text style={styles.rowValue}>2 — Faucet aggregator</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F8FA" },
  headerBar: { paddingHorizontal: 20, paddingVertical: 12 },
  title: { fontSize: 24, fontWeight: "700" },
  list: { padding: 20, gap: 16 },
  sectionLabel: { fontSize: 12, fontWeight: "600", opacity: 0.5, textTransform: "uppercase", marginLeft: 4 },
  section: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12 },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0"
  },
  rowLabel: { fontSize: 15 },
  rowValue: { fontSize: 13, opacity: 0.6 },
  rowHint: { fontSize: 12, opacity: 0.55, paddingHorizontal: 12, paddingBottom: 12 },
  dangerLabel: { color: "#B00020" },
  actionChevron: { fontSize: 18, opacity: 0.4 },
  choice: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12 },
  choiceLabel: { fontSize: 15 },
  choiceCheck: { fontSize: 16, color: "#007AFF", fontWeight: "700" }
})

export default SettingsScreen
