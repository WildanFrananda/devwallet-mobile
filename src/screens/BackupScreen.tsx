import { useState, type JSX } from "react"
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import Clipboard from "@react-native-clipboard/clipboard"
import { useViewModel, useStream } from "react-native-mobile-mvvm"
import BackupViewModel from "../viewmodels/BackupViewModel"
import type Account from "../models/account.model"
import { NetworkRegistry } from "../core/constants/networks"
import { truncateAddress } from "../utils/format"
import { useDismissKeyboardWhenFilled } from "../hooks/useDismissKeyboardWhenFilled"
import DotGridBackground from "../components/DotGridBackground"
import LockGlyph from "../components/LockGlyph"
import MnemonicGrid from "../components/MnemonicGrid"
import PrimaryButton from "../components/PrimaryButton"
import SecondaryButton from "../components/SecondaryButton"
import { colors, typography, spacing, radius, hairline, chainColors, type ChainColorKey } from "../theme"

function BackupScreen(): JSX.Element {
  const insets = useSafeAreaInsets()
  const nav = useNavigation()
  const vm = useViewModel(BackupViewModel)
  const reveal = useStream(vm.reveal$, vm.reveal$.value)
  const [pin, setPin] = useState<string>("")

  useDismissKeyboardWhenFilled(pin.length)

  const errorMessage = reveal.status === "error" ? reveal.message : null

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]} testID="backup-screen">
      <DotGridBackground />
      <View style={styles.headerBar}>
        <Pressable onPress={() => nav.goBack()} hitSlop={8}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Backup</Text>
        <View style={styles.right} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.warning}>
          <Text style={styles.warningTitle}>⚠ Secrets ahead</Text>
          <Text style={styles.warningBody}>
            Anyone with your recovery phrase or a private key controls these accounts. Never share or screenshot them.
            DevWallet will never ask for them.
          </Text>
        </View>

        {reveal.status === "success" ? (
          <Revealed words={reveal.data.words} accounts={reveal.data.accounts} />
        ) : (
          <View style={styles.gate}>
            <LockGlyph color={colors.accentWarm} />
            <Text style={styles.gateHint}>Enter your 6-digit PIN to reveal.</Text>
            <TextInput
              style={styles.pinInput}
              value={pin}
              onChangeText={v => setPin(v.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              autoFocus
              testID="backup.pin-input"
            />
            {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
            <PrimaryButton
              testID="backup.reveal"
              label={reveal.status === "loading" ? "Revealing…" : "Reveal"}
              onPress={() => vm.reveal(pin)}
              loading={reveal.status === "loading"}
              disabled={pin.length !== 6}
            />
          </View>
        )}
      </ScrollView>

      {reveal.status === "success" && (
        <View style={[styles.footerBar, { paddingBottom: insets.bottom + spacing.sm }]}>
          <SecondaryButton
            label="Hide secrets"
            onPress={() => {
              setPin("")
              vm.hide()
            }}
          />
        </View>
      )}
    </View>
  )
}

function Revealed({
  words,
  accounts
}: {
  words: ReadonlyArray<string>
  accounts: ReadonlyArray<Account>
}): JSX.Element {
  return (
    <View style={styles.revealCol}>
      <Text style={styles.sectionLabel}>RECOVERY PHRASE</Text>
      <MnemonicGrid words={words} />
      <Pressable
        style={styles.copyPhrase}
        onPress={() => {
          Clipboard.setString(words.join(" "))
          Alert.alert("Copied", "Recovery phrase copied to clipboard")
        }}
      >
        <Text style={styles.copyPhraseText}>Copy phrase</Text>
      </Pressable>

      <Text style={styles.sectionLabel}>PRIVATE KEYS</Text>
      {accounts.map(acc => (
        <PrivateKeyCard key={`${acc.chain}-${acc.index}`} account={acc} />
      ))}
    </View>
  )
}

function PrivateKeyCard({ account }: { account: Account }): JSX.Element {
  const [shown, setShown] = useState<boolean>(false)
  const cfg = NetworkRegistry.get(account.chain)
  const hue = chainColors[account.chain as ChainColorKey] ?? colors.border

  return (
    <View style={[styles.pkCard, { borderColor: hue + "33" }]}>
      <View style={styles.pkHead}>
        <View style={styles.pkNameLine}>
          <View style={[styles.dot, { backgroundColor: hue }]} />
          <Text style={styles.pkName}>{cfg.name}</Text>
          <Text style={styles.pkSymbol}>{cfg.symbol}</Text>
        </View>
        <Text style={styles.pkAddr} numberOfLines={1}>
          {truncateAddress(account.address)}
        </Text>
      </View>

      <Text style={styles.pkKey} selectable numberOfLines={shown ? undefined : 1}>
        {shown ? account.privateKey : "•".repeat(44)}
      </Text>

      <View style={styles.pkActions}>
        <Pressable style={styles.pkBtn} onPress={() => setShown(s => !s)}>
          <Text style={styles.pkBtnText}>{shown ? "Hide" : "Reveal"}</Text>
        </Pressable>
        <Pressable
          style={styles.pkBtn}
          onPress={() => {
            Clipboard.setString(account.privateKey)
            Alert.alert("Copied", `${cfg.name} private key copied`)
          }}
        >
          <Text style={styles.pkBtnText}>Copy</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm
  },
  back: { ...typography.monoLabelSm, color: colors.accentText },
  title: { ...typography.titleMd, color: colors.textPrimary },
  right: { width: 36 },
  body: { padding: spacing.lg, gap: spacing.lg },
  warning: {
    backgroundColor: colors.accentWarm + "14",
    borderWidth: hairline,
    borderColor: colors.accentWarm + "44",
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs
  },
  warningTitle: { ...typography.monoLabelSm, color: colors.accentWarm },
  warningBody: { ...typography.bodyMd, color: colors.textSecondary },
  gate: { gap: spacing.md, alignItems: "stretch", paddingTop: spacing.md },
  gateHint: { ...typography.bodyMd, color: colors.textSecondary, textAlign: "center" },
  pinInput: {
    backgroundColor: colors.elevation1,
    borderWidth: hairline,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    fontSize: 26,
    textAlign: "center",
    letterSpacing: 14,
    color: colors.textPrimary
  },
  error: { ...typography.bodyMd, color: colors.error, textAlign: "center" },
  revealCol: { gap: spacing.sm },
  sectionLabel: { ...typography.labelXs, color: colors.textMuted, marginTop: spacing.sm },
  copyPhrase: {
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: hairline,
    borderColor: colors.border,
    backgroundColor: colors.elevation1
  },
  copyPhraseText: { ...typography.monoLabelSm, color: colors.accentText },
  pkCard: {
    backgroundColor: colors.elevation1,
    borderRadius: radius.lg,
    borderWidth: hairline,
    padding: spacing.md,
    gap: spacing.sm
  },
  pkHead: { gap: spacing.xxs },
  pkNameLine: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dot: { width: 7, height: 7, borderRadius: radius.full },
  pkName: { ...typography.titleMd, color: colors.textPrimary },
  pkSymbol: { ...typography.monoLabelSm, color: colors.textMuted },
  pkAddr: { ...typography.monoDataSm, color: colors.textMuted },
  pkKey: {
    ...typography.monoDataSm,
    color: colors.textPrimary,
    backgroundColor: colors.elevation0,
    borderRadius: radius.sm,
    padding: spacing.sm
  },
  pkActions: { flexDirection: "row", gap: spacing.sm },
  pkBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: hairline,
    borderColor: colors.border,
    backgroundColor: colors.elevation2,
    alignItems: "center"
  },
  pkBtnText: { ...typography.monoLabelSm, color: colors.accentText },
  footerBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: hairline,
    borderTopColor: colors.border,
    backgroundColor: colors.background
  }
})

export default BackupScreen
