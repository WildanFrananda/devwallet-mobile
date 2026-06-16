import { type JSX } from "react"
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRoute, type RouteProp } from "@react-navigation/native"
import QRCode from "react-native-qrcode-svg"
import Clipboard from "@react-native-clipboard/clipboard"
import { Chain } from "../core/constants/chains.enum"
import { NetworkRegistry } from "../core/constants/networks"
import Section from "../components/Section"
import DotGridBackground from "../components/DotGridBackground"
import FadeInView from "../components/FadeInView"
import { colors, typography, spacing, radius, hairline, chainColors, type ChainColorKey } from "../theme"

type AppStackParamList = {
  Receive: { chain: Chain; address: string }
}

function ReceiveScreen(): JSX.Element {
  const route = useRoute<RouteProp<AppStackParamList, "Receive">>()
  const { chain, address } = route.params
  const cfg = NetworkRegistry.get(chain)
  const dot = chainColors[chain as ChainColorKey] ?? colors.border

  function copy(): void {
    Clipboard.setString(address)
    Alert.alert("Copied", "Address copied to clipboard")
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]} testID="receive-screen">
      <DotGridBackground />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>RECEIVE</Text>
          <View style={styles.chainTag}>
            <View style={[styles.dot, { backgroundColor: dot }]} />
            <Text style={styles.chainName}>{cfg.name}</Text>
            <Text style={styles.chainSym}>{cfg.symbol}</Text>
          </View>
        </View>

        <FadeInView style={styles.qrFrame} fromScale={0.94} translateY={6} delay={40}>
          <View style={styles.qrInner}>
            <QRCode value={address} size={220} backgroundColor="#FFFFFF" color="#000000" />
          </View>
          <Text style={styles.qrCaption}>SCAN TO SEND {cfg.symbol}</Text>
        </FadeInView>

        <Section title="YOUR ADDRESS">
          <Text style={styles.address} selectable>
            {address}
          </Text>
          <Pressable style={styles.copyBtn} onPress={copy} testID="receive.copy">
            <Text style={styles.copyBtnText}>Copy address</Text>
          </Pressable>
        </Section>

        <View style={styles.callout}>
          <View style={styles.calloutDot} />
          <Text style={styles.calloutText}>
            Only send {cfg.symbol} on {cfg.name} here. Other assets or networks may be permanently lost.
          </Text>
        </View>

        <Text style={styles.footer}>{cfg.name.toUpperCase()} · TESTNET · DERIVED ON-DEVICE</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.xl
  },
  header: {
    gap: spacing.sm
  },
  eyebrow: {
    ...typography.monoLabelSm,
    color: colors.textMuted
  },
  chainTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full
  },
  chainName: {
    ...typography.headlineMd,
    color: colors.textPrimary
  },
  chainSym: {
    ...typography.monoLabelSm,
    color: colors.textMuted
  },
  qrFrame: {
    alignSelf: "center",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  qrInner: {
    padding: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: "#FFFFFF"
  },
  qrCaption: {
    ...typography.monoLabelSm,
    color: colors.textMuted
  },
  address: {
    ...typography.monoDataSm,
    color: colors.textSecondary
  },
  copyBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: hairline,
    borderColor: colors.accent,
    alignItems: "center"
  },
  copyBtnText: {
    ...typography.monoLabelSm,
    color: colors.accentText
  },
  callout: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  calloutDot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
    backgroundColor: colors.warning,
    marginTop: 5
  },
  calloutText: {
    ...typography.bodyMd,
    color: colors.textSecondary,
    flex: 1
  },
  footer: {
    ...typography.monoLabelSm,
    color: colors.textMuted,
    textAlign: "center"
  }
})

export default ReceiveScreen
