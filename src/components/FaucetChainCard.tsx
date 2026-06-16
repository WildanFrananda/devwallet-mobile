import { type JSX, useEffect, useRef } from "react"
import { View, Text, StyleSheet, Pressable, Linking, Animated } from "react-native"
import Svg, { Defs, LinearGradient, Stop, Circle } from "react-native-svg"
import type { ChainRow } from "../viewmodels/FaucetViewModel"
import type { NetworkConfig } from "../core/constants/networks"
import { truncateAddress } from "../utils/format"
import {
  colors,
  typography,
  spacing,
  radius,
  hairline,
  chainColors,
  type ChainColorKey,
  duration,
  easing,
  spring,
  stagger
} from "../theme"

type Props = {
  cfg: NetworkConfig
  address: string | undefined
  row: ChainRow | undefined
  /** Re-render tick (ms) so rate-limit countdowns update live. */
  now: number
  /** Stable per-chain slug for testIDs (faucet.row.<slug>.*). */
  slug: string
  /** Row position — drives the entrance stagger. */
  index?: number
  onRequest: () => void
}

const STATUS_LABEL: Readonly<Record<string, string>> = {
  idle: "READY",
  pending: "QUEUED",
  processing: "PROCESSING",
  completed: "SENT",
  failed: "FAILED"
}

const STATUS_COLOR: Readonly<Record<string, string>> = {
  idle: colors.textMuted,
  pending: colors.warning,
  processing: colors.info,
  completed: colors.success,
  failed: colors.error
}

function formatCountdown(ms: number): string {
  const secs = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

/** Glossy token coin — chain-hue gradient sphere with the ticker on top. */
function CoinAvatar({ hue, ticker, slug }: { hue: string; ticker: string; slug: string }): JSX.Element {
  const gid = `coin-${slug}`
  return (
    <View style={styles.coinWrap}>
      <Svg width={48} height={48} viewBox="0 0 48 48">
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={hue} stopOpacity={1} />
            <Stop offset="1" stopColor={hue} stopOpacity={0.32} />
          </LinearGradient>
        </Defs>
        <Circle cx={24} cy={24} r={23} fill={`url(#${gid})`} />
      </Svg>
      <View style={styles.coinTickerWrap} pointerEvents="none">
        <Text style={styles.coinTicker} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {ticker}
        </Text>
      </View>
    </View>
  )
}

function FaucetChainCard({ cfg, address, row, now, slug, index = 0, onRequest }: Props): JSX.Element {
  const status = row?.status ?? "idle"
  const hue = chainColors[cfg.chain as ChainColorKey] ?? colors.accent
  const statusColor = STATUS_COLOR[status] ?? colors.textMuted
  const stillLimited = !!(row?.rateLimitedUntilMs && row.rateLimitedUntilMs > now)
  const canRequest = (status === "idle" || status === "failed" || status === "completed") && !!address
  const inFlight = status === "pending" || status === "processing"
  const isSent = status === "completed"

  // Entrance fade + lift; CTA press spring; in-flight status pulse; success pop.
  const enter = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(1)).current
  const pulse = useRef(new Animated.Value(1)).current
  const pop = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: duration.normal,
      delay: Math.min(index, 6) * stagger,
      easing: easing.out,
      useNativeDriver: true
    }).start()
  }, [enter, index])

  useEffect(() => {
    if (!inFlight) {
      pulse.setValue(1)
      return
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 600, easing: easing.inOut, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, easing: easing.inOut, useNativeDriver: true })
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [inFlight, pulse])

  useEffect(() => {
    if (!isSent) return
    pop.setValue(0.8)
    Animated.spring(pop, { toValue: 1, ...spring, useNativeDriver: true }).start()
  }, [isSent, pop])

  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] })

  const actionLabel = isSent ? "Request again" : status === "failed" ? "Retry" : "Request"
  const actionFilled = status === "idle"

  return (
    <Animated.View
      style={[
        styles.card,
        { borderColor: hue + "33", shadowColor: hue, opacity: enter, transform: [{ translateY }] }
      ]}
      testID={`faucet.row.${slug}`}
    >
      {/* faint chain-hue wash so each card glows its own network */}
      <View style={[styles.wash, { backgroundColor: hue + "0d" }]} pointerEvents="none" />

      <View style={styles.headRow}>
        <CoinAvatar hue={hue} ticker={cfg.symbol} slug={slug} />

        <View style={styles.idCol}>
          <Text style={styles.chainName} numberOfLines={1}>
            {cfg.name}
          </Text>
          <Text style={styles.address} numberOfLines={1}>
            {address ? truncateAddress(address) : "—"}
          </Text>
        </View>

        <View
          style={[styles.statusPill, { backgroundColor: statusColor + "1a", borderColor: statusColor + "55" }]}
          testID={`faucet.row.${slug}.status-${status}`}
        >
          <Animated.View style={[styles.statusDot, { backgroundColor: statusColor, opacity: inFlight ? pulse : 1 }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABEL[status] ?? status}</Text>
        </View>
      </View>

      {isSent && row?.amount && (
        <Animated.View style={[styles.receipt, { transform: [{ scale: pop }] }]}>
          <Text style={styles.receiptAmount} testID={`faucet.row.${slug}.amount`}>
            +{row.amount} {cfg.symbol}
          </Text>
          {row?.txHash && cfg.explorerUrl && (
            <Pressable
              style={styles.txRow}
              onPress={() => void Linking.openURL(`${cfg.explorerUrl}/tx/${row.txHash ?? ""}`)}
            >
              <Text style={styles.txLink} numberOfLines={1}>
                {truncateAddress(row.txHash)}
              </Text>
              <Text style={styles.txArrow}>↗</Text>
            </Pressable>
          )}
        </Animated.View>
      )}

      {row?.errorMessage && status === "failed" && <Text style={styles.errorLine}>{row.errorMessage}</Text>}

      {stillLimited && row?.rateLimitedUntilMs && (
        <View style={styles.limitRow}>
          <View style={styles.limitDot} />
          <Text style={styles.limitText}>RATE LIMITED · RETRY IN {formatCountdown(row.rateLimitedUntilMs - now)}</Text>
        </View>
      )}

      {row?.manualUrl && (
        <Pressable style={styles.manualBtn} onPress={() => void Linking.openURL(row.manualUrl ?? "")}>
          <Text style={styles.manualText}>Open faucet ↗</Text>
        </Pressable>
      )}

      {canRequest && (
        <Animated.View style={{ transform: [{ scale }] }}>
          <Pressable
            testID={`faucet.row.${slug}.request`}
            style={[
              styles.action,
              actionFilled ? styles.actionFilled : status === "failed" ? styles.actionRetry : styles.actionGhost,
              stillLimited && styles.actionDisabled
            ]}
            onPress={onRequest}
            disabled={stillLimited}
            onPressIn={() => Animated.spring(scale, { toValue: 0.97, ...spring, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(scale, { toValue: 1, ...spring, useNativeDriver: true }).start()}
          >
            <Text
              style={[
                styles.actionText,
                actionFilled
                  ? styles.actionFilledText
                  : status === "failed"
                    ? styles.actionRetryText
                    : styles.actionGhostText
              ]}
            >
              {actionLabel}
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.elevation1,
    borderRadius: radius.xl,
    borderWidth: hairline,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4
  },
  wash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  coinWrap: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center"
  },
  coinTickerWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4
  },
  coinTicker: {
    ...typography.monoLabelSm,
    fontSize: 12,
    color: colors.textPrimary,
    letterSpacing: 0.3
  },
  idCol: {
    flex: 1,
    gap: spacing.xxs
  },
  chainName: {
    ...typography.bodyLg,
    fontWeight: "600",
    color: colors.textPrimary
  },
  address: {
    ...typography.monoDataSm,
    color: colors.textMuted
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    borderWidth: hairline
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: radius.full
  },
  statusText: {
    ...typography.labelXs,
    fontSize: 10
  },
  receipt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.successGlow
  },
  receiptAmount: {
    ...typography.monoDataMd,
    color: colors.success
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 1
  },
  txLink: {
    ...typography.monoDataSm,
    color: colors.accentText,
    flexShrink: 1
  },
  txArrow: {
    ...typography.monoDataSm,
    color: colors.accentText
  },
  errorLine: {
    ...typography.monoDataSm,
    color: colors.error
  },
  limitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
    backgroundColor: colors.warning + "14"
  },
  limitDot: {
    width: 5,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: colors.warning
  },
  limitText: {
    ...typography.monoLabelSm,
    color: colors.warning
  },
  manualBtn: {
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: hairline,
    borderColor: colors.border,
    alignItems: "center"
  },
  manualText: {
    ...typography.monoLabelSm,
    color: colors.accentText
  },
  action: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  actionFilled: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4
  },
  actionGhost: {
    borderWidth: hairline,
    borderColor: colors.border,
    backgroundColor: colors.elevation2
  },
  actionRetry: {
    borderWidth: hairline,
    borderColor: colors.error + "66",
    backgroundColor: colors.error + "14"
  },
  actionDisabled: {
    opacity: 0.4
  },
  actionText: {
    ...typography.monoLabelSm,
    fontSize: 13
  },
  actionFilledText: {
    color: colors.onAccent
  },
  actionGhostText: {
    color: colors.accentText
  },
  actionRetryText: {
    color: colors.error
  }
})

export default FaucetChainCard
