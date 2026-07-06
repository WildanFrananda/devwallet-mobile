import { type JSX, useEffect, useRef } from "react"
import { View, Text, StyleSheet, Animated } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { colors, typography, spacing, radius, hairline, chainColors, easing as motionEasing } from "../theme"
import PrimaryButton from "../components/PrimaryButton"
import SecondaryButton from "../components/SecondaryButton"
import DotGridBackground from "../components/DotGridBackground"
import { IS_E2E } from "../core/constants/e2e"

type Props = {
  onCreate: () => void
  onRestore: () => void
}

/** 8 supported testnets — colored dot + short ticker so the row is self-explanatory. */
const NETWORKS: ReadonlyArray<{ label: string; color: string }> = [
  { label: "ETH", color: chainColors["evm:sepolia"] },
  { label: "POLY", color: chainColors["evm:polygon-amoy"] },
  { label: "BASE", color: chainColors["evm:base-sepolia"] },
  { label: "BTC", color: chainColors["bitcoin:testnet"] },
  { label: "SOL", color: chainColors["solana:devnet"] },
  { label: "ATOM", color: chainColors["cosmos:theta-testnet"] },
  { label: "XRP", color: chainColors["xrpl:testnet"] },
  { label: "STRK", color: chainColors["starknet:sepolia"] }
]

/** A network chip that "comes online" — fades + lifts in, dot scales from 0. */
function NetworkChip({ label, color, anim }: { label: string; color: string; anim: Animated.Value }): JSX.Element {
  return (
    <Animated.View
      style={[
        styles.chip,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }]
        }
      ]}
    >
      <Animated.View style={[styles.chipDot, { backgroundColor: color, transform: [{ scale: anim }] }]} />
      <Text style={styles.chipLabel}>{label}</Text>
    </Animated.View>
  )
}

/**
 * Welcome — DevWallet cold-open. Developer-tool register, Linear/Vercel
 * restraint. Three left-aligned zones; single indigo accent; hairline
 * structure; no shadows. Mount = staged boot reveal (opacity + small lift,
 * linear easing) ending with the 8 networks coming online one by one like a
 * terminal status check. A blinking cursor trails the headline.
 */
function WelcomeScreen({ onCreate, onRestore }: Props): JSX.Element {
  const eyebrow = useRef(new Animated.Value(0)).current
  const headline = useRef(new Animated.Value(0)).current
  const netCaption = useRef(new Animated.Value(0)).current
  const chips = useRef(NETWORKS.map(n => ({ ...n, anim: new Animated.Value(0) }))).current
  const actions = useRef(new Animated.Value(0)).current
  const cursor = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const fade = (v: Animated.Value, delay: number): Animated.CompositeAnimation =>
      Animated.timing(v, { toValue: 1, duration: 180, delay, easing: motionEasing.out, useNativeDriver: true })

    Animated.sequence([
      fade(eyebrow, 0),
      fade(headline, 20),
      fade(netCaption, 40),
      // networks come online left-to-right, 55ms apart — the "status check"
      Animated.stagger(55, chips.map(c => fade(c.anim, 0))),
      fade(actions, 40)
    ]).start()

    // blinking terminal cursor after the headline — skipped under E2E, where its
    // perpetual 530ms timer would keep Detox from ever idling.
    if (!IS_E2E) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(cursor, { toValue: 0, duration: 0, delay: 530, useNativeDriver: true }),
          Animated.timing(cursor, { toValue: 1, duration: 0, delay: 530, useNativeDriver: true })
        ])
      ).start()
    }
  }, [eyebrow, headline, netCaption, chips, actions, cursor])

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]} testID="welcome-screen">
      <DotGridBackground />
      {/* Zone 1 — top-left: status banner + wordmark */}
      <Animated.View style={[styles.topZone, { opacity: eyebrow }]}>
        <View style={styles.statusLine}>
          <View style={styles.statusDot} />
          <Text style={styles.eyebrow}>DEVWALLET · v0.5 · TESTNET ONLY · KEYS ON-DEVICE</Text>
        </View>
        <Text style={styles.wordmark}>DevWallet</Text>
      </Animated.View>

      {/* Zone 2 — middle, top-anchored: headline + promise + network boot row */}
      <View style={styles.midZone}>
        <Animated.View style={{ opacity: headline }}>
          <View style={styles.headlineRow}>
            <Text style={styles.headline}>Eight testnets.</Text>
            <Animated.Text style={[styles.cursor, { opacity: cursor }]}>▋</Animated.Text>
          </View>
          <Text style={styles.headline}>One wallet.</Text>
          <Text style={styles.body}>
            Generate keys on-device. Faucet, send, and inspect transactions across every chain.
          </Text>
        </Animated.View>

        <View>
          <Animated.Text style={[styles.netCaption, { opacity: netCaption }]}>SUPPORTED NETWORKS</Animated.Text>
          <View style={styles.chipRow}>
            {chips.map(c => (
              <NetworkChip key={c.label} label={c.label} color={c.color} anim={c.anim} />
            ))}
          </View>
        </View>
      </View>

      {/* Zone 3 — docked bottom: hairline horizon + single fill + outline + footer */}
      <Animated.View style={[styles.bottomZone, { opacity: actions }]}>
        <View style={styles.horizon} />
        <PrimaryButton testID="welcome.create-wallet" label="Create wallet" onPress={onCreate} />
        <SecondaryButton testID="welcome.restore-wallet" label="I already have a phrase" onPress={onRestore} />
        <Text style={styles.footer}>NON-CUSTODIAL · NO ACCOUNT · NO TRACKING</Text>
      </Animated.View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg
  },

  // Zone 1
  topZone: {
    paddingTop: spacing.xl,
    gap: spacing.md
  },
  statusLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.accent
  },
  eyebrow: {
    ...typography.monoLabelSm,
    color: colors.textMuted
  },
  wordmark: {
    ...typography.headlineMd,
    color: colors.textPrimary
  },

  // Zone 2
  midZone: {
    flex: 1,
    justifyContent: "flex-start",
    paddingTop: spacing.xxl,
    gap: spacing.xl
  },
  headlineRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  headline: {
    ...typography.headlineLg,
    fontSize: 40,
    lineHeight: 46,
    color: colors.textPrimary
  },
  cursor: {
    ...typography.headlineLg,
    fontSize: 36,
    lineHeight: 46,
    color: colors.accent,
    marginLeft: spacing.sm
  },
  body: {
    ...typography.bodyMd,
    color: colors.textSecondary,
    marginTop: spacing.md,
    maxWidth: 320
  },
  netCaption: {
    ...typography.monoLabelSm,
    color: colors.textMuted,
    marginBottom: spacing.md
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  chipDot: {
    width: 7,
    height: 7,
    borderRadius: radius.full
  },
  chipLabel: {
    ...typography.monoDataSm,
    color: colors.textSecondary
  },

  // Zone 3
  bottomZone: {
    paddingBottom: spacing.sm,
    gap: spacing.sm
  },
  horizon: {
    height: hairline,
    backgroundColor: colors.border,
    marginBottom: spacing.xl
  },
  footer: {
    ...typography.monoLabelSm,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.md
  }
})

export default WelcomeScreen
