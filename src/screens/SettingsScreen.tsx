import { useEffect, useState, type JSX } from "react"
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import DeviceInfo from "react-native-device-info"
import Config from "react-native-config"
import { useViewModel, useStream } from "react-native-mobile-mvvm"
import SettingsViewModel from "../viewmodels/SettingsViewModel"
import { AUTO_LOCK_CHOICES } from "../core/storage/settings.service"
import type { AppStackParamList } from "../navigation/AppNavigator"
import Section from "../components/Section"
import DotGridBackground from "../components/DotGridBackground"
import { colors, typography, spacing, radius, hairline } from "../theme"

type AppNav = NativeStackNavigationProp<AppStackParamList>

function Meta({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  )
}

function SettingsScreen(): JSX.Element {
  const insets = useSafeAreaInsets()
  const nav = useNavigation<AppNav>()
  const vm = useViewModel(SettingsViewModel)
  const autoLockMs = useStream(vm.autoLockMs$, vm.autoLockMs$.value)
  const useBiometric = useStream(vm.useBiometric$, vm.useBiometric$.value)
  const logout = useStream(vm.logout$, vm.logout$.value)
  const [version, setVersion] = useState<string>("…")
  const [buildNumber, setBuildNumber] = useState<string>("…")

  useEffect(() => {
    setVersion(DeviceInfo.getVersion())
    setBuildNumber(DeviceInfo.getBuildNumber())
  }, [])

  function confirmLogout(): void {
    Alert.alert(
      "Log out & wipe wallet?",
      "This permanently deletes your recovery phrase, private keys, and PIN from this device. " +
        "You can only get this wallet back with your recovery phrase. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Wipe everything", style: "destructive", onPress: () => vm.logout() }
      ]
    )
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]} testID="settings-screen">
      <DotGridBackground />
      <View style={styles.headerBar}>
        <Text style={styles.eyebrow}>DEVWALLET</Text>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <Section title="SECURITY">
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Use biometric</Text>
              <Text style={styles.rowHint}>When off, the app unlocks with your PIN. Recommended where available.</Text>
            </View>
            <Switch
              value={useBiometric}
              onValueChange={v => vm.setUseBiometric(v)}
              trackColor={{ true: colors.accent, false: colors.border }}
              thumbColor={colors.textPrimary}
            />
          </View>

          <View style={styles.sep} />

          <Pressable style={styles.actionRow} onPress={() => nav.navigate("ChangePin")}>
            <Text style={styles.rowLabel}>Change PIN</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          <View style={styles.sep} />

          <Pressable style={styles.actionRow} onPress={() => vm.lockNow()} testID="settings.lock-now">
            <Text style={[styles.rowLabel, styles.danger]}>Lock now</Text>
            <Text style={[styles.chevron, styles.danger]}>›</Text>
          </Pressable>
        </Section>

        <Section title="BACKUP & RECOVERY">
          <Pressable style={styles.actionRow} onPress={() => nav.navigate("Backup")} testID="settings.backup">
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Back up wallet</Text>
              <Text style={styles.rowHint}>Reveal your recovery phrase + private keys (PIN required).</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </Section>

        <Section title="AUTO-LOCK">
          {AUTO_LOCK_CHOICES.map((choice, i) => {
            const selected = choice.ms === autoLockMs
            return (
              <View key={choice.label}>
                {i > 0 && <View style={styles.sep} />}
                <Pressable style={styles.choice} onPress={() => vm.setAutoLockMs(choice.ms)}>
                  <Text style={[styles.rowLabel, selected && styles.selectedLabel]}>{choice.label}</Text>
                  {selected && <Text style={styles.check}>✓</Text>}
                </Pressable>
              </View>
            )
          })}
          <Text style={styles.footHint}>Wallet locks after the app stays in background this long.</Text>
        </Section>

        <Section title="ABOUT">
          <Meta label="APP VERSION" value={`${version} (${buildNumber})`} />
          <View style={styles.sep} />
          <Meta label="REACT NATIVE" value="0.85.3" />
          <View style={styles.sep} />
          <Meta label="COMMIT" value={Config.GIT_COMMIT || "dev"} />
          <View style={styles.sep} />
          <Meta label="LICENSE" value="MIT · OPEN SOURCE" />
        </Section>

        <Pressable
          style={styles.logoutBtn}
          onPress={confirmLogout}
          disabled={logout.status === "loading"}
          testID="settings.logout"
        >
          <Text style={styles.logoutText}>{logout.status === "loading" ? "Wiping…" : "Log out & wipe wallet"}</Text>
        </Pressable>
        {logout.status === "error" && <Text style={styles.logoutError}>{logout.message}</Text>}

        <Text style={styles.footer}>NON-CUSTODIAL · KEYS ON-DEVICE · TESTNET ONLY</Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background
  },
  headerBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.xs
  },
  eyebrow: {
    ...typography.monoLabelSm,
    color: colors.textMuted
  },
  title: {
    ...typography.headlineMd,
    color: colors.textPrimary
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.xl
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md
  },
  rowText: {
    flex: 1,
    gap: spacing.xs
  },
  rowLabel: {
    ...typography.bodyLg,
    color: colors.textPrimary
  },
  rowHint: {
    ...typography.bodyMd,
    color: colors.textMuted
  },
  sep: {
    height: hairline,
    backgroundColor: colors.border
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs
  },
  chevron: {
    ...typography.headlineMd,
    color: colors.textMuted
  },
  danger: {
    color: colors.error
  },
  choice: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm
  },
  selectedLabel: {
    color: colors.accentText
  },
  check: {
    ...typography.bodyLg,
    color: colors.accent
  },
  footHint: {
    ...typography.monoLabelSm,
    color: colors.textMuted,
    marginTop: spacing.sm
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs
  },
  metaLabel: {
    ...typography.monoLabelSm,
    color: colors.textMuted
  },
  metaValue: {
    ...typography.monoDataSm,
    color: colors.textSecondary
  },
  logoutBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: hairline,
    borderColor: colors.error + "55",
    backgroundColor: colors.error + "14",
    alignItems: "center"
  },
  logoutText: {
    ...typography.bodyLg,
    fontWeight: "600",
    color: colors.error
  },
  logoutError: {
    ...typography.monoDataSm,
    color: colors.error,
    textAlign: "center"
  },
  footer: {
    ...typography.monoLabelSm,
    color: colors.textMuted,
    textAlign: "center"
  }
})

export default SettingsScreen
