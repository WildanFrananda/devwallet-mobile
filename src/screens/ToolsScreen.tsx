import { type JSX, useRef, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, Pressable, Animated } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import Svg, { Path, Rect, Circle, Line, Polyline } from "react-native-svg"
import type { AppStackParamList } from "../navigation/AppNavigator"
import DotGridBackground from "../components/DotGridBackground"
import { colors, typography, spacing, radius, hairline, duration, easing, spring, stagger } from "../theme"

type AppNav = NativeStackNavigationProp<AppStackParamList>
type IconProps = { color: string }

/* ── per-tool line icons (stroke, dev-tool style) ───────────────────────── */
function RpcIcon({ color }: IconProps): JSX.Element {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Polyline points="3,13 7,13 9,7 12,17 14,11 17,11 21,11" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}
function ContractIcon({ color }: IconProps): JSX.Element {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={4} width={18} height={16} rx={2.5} stroke={color} strokeWidth={1.7} />
      <Path d="M7 9l3 3-3 3" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1={13} y1={15} x2={17} y2={15} stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  )
}
function GasIcon({ color }: IconProps): JSX.Element {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M4 19a8 8 0 1 1 16 0" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Line x1={12} y1={19} x2={15.5} y2={10.5} stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Circle cx={12} cy={19} r={1.6} fill={color} />
    </Svg>
  )
}
function ReplayIcon({ color }: IconProps): JSX.Element {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12a8 8 0 1 0 2.3-5.6" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Polyline points="3,3 4,7 8,6.5" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}
function WebhookIcon({ color }: IconProps): JSX.Element {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={3} stroke={color} strokeWidth={1.7} />
      <Path d="M9.5 10.5 6 17h6" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14.5 10.5 18 17h-4" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={17} r={1.4} fill={color} />
    </Svg>
  )
}
function NftIcon({ color }: IconProps): JSX.Element {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={4} width={16} height={16} rx={2.5} stroke={color} strokeWidth={1.7} />
      <Circle cx={9} cy={9.5} r={1.6} stroke={color} strokeWidth={1.5} />
      <Path d="M5 17l4.5-5 3.5 3.5L16 12l3 4" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

type ToolEntry = {
  label: string
  description: string
  to: keyof AppStackParamList
  testID: string
  color: string
  Icon: (p: IconProps) => JSX.Element
}

/* Per-tool identity color — used ONLY in the small icon chip (functional, like
 * chain dots), never as a card fill. Gives the grid life without flooding hue. */
const TOOLS: ReadonlyArray<ToolEntry> = [
  { label: "RPC Inspector", description: "Live log · replay · mock", to: "RpcInspector", testID: "tools.rpc-inspector", color: "#5e6ad2", Icon: RpcIcon },
  { label: "Contract Terminal", description: "Paste ABI · call functions", to: "ContractTerminal", testID: "tools.contract-terminal", color: "#4CB782", Icon: ContractIcon },
  { label: "Gas Oracle", description: "3-tier fees · 24h chart", to: "GasOracle", testID: "tools.gas-oracle", color: "#ffb867", Icon: GasIcon },
  { label: "TX Replay", description: "Decode mainnet → testnet", to: "TxReplay", testID: "tools.tx-replay", color: "#60A5FA", Icon: ReplayIcon },
  { label: "Webhooks", description: "Contract events → push", to: "WebhookList", testID: "tools.webhooks", color: "#8247E5", Icon: WebhookIcon },
  { label: "NFT Gallery", description: "Testnet NFTs · EVM + SOL", to: "NftGallery", testID: "tools.nft-gallery", color: "#EC796B", Icon: NftIcon }
]

function ToolCard({ tool, index, onPress }: { tool: ToolEntry; index: number; onPress: () => void }): JSX.Element {
  const enter = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: duration.normal,
      delay: index * stagger,
      easing: easing.out,
      useNativeDriver: true
    }).start()
  }, [enter, index])

  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] })

  return (
    <Animated.View style={[styles.cardWrap, { opacity: enter, transform: [{ translateY }, { scale }] }]}>
      <Pressable
        testID={tool.testID}
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, ...spring, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, ...spring, useNativeDriver: true }).start()}
        style={[styles.card, { borderColor: tool.color + "44" }]}
      >
        <View style={[styles.iconChip, { backgroundColor: tool.color + "1f" }]}>
          <tool.Icon color={tool.color} />
        </View>
        <Text style={styles.cardLabel}>{tool.label}</Text>
        <Text style={styles.cardDesc}>{tool.description}</Text>
      </Pressable>
    </Animated.View>
  )
}

function ToolsScreen(): JSX.Element {
  const nav = useNavigation<AppNav>()
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]} testID="tools-screen">
      <DotGridBackground />
      <View style={styles.headerBar}>
        <Text style={styles.eyebrow}>DEVKIT · {TOOLS.length} TOOLS</Text>
        <Text style={styles.title}>Tools</Text>
        <Text style={styles.subtitle}>Inspect, simulate, and debug across every testnet.</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.grid}>
          {TOOLS.map((tool, i) => (
            <ToolCard key={tool.to} tool={tool} index={i} onPress={() => nav.navigate(tool.to as never)} />
          ))}
        </View>
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
    paddingBottom: spacing.md,
    gap: spacing.xs
  },
  eyebrow: {
    ...typography.labelXs,
    color: colors.textMuted
  },
  title: {
    ...typography.headlineLg,
    color: colors.textPrimary
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.textSecondary
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  cardWrap: {
    // two per row minus the gap
    width: "47.8%",
    flexGrow: 1
  },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: hairline,
    backgroundColor: colors.elevation1,
    gap: spacing.sm,
    minHeight: 132,
    justifyContent: "flex-start"
  },
  iconChip: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs
  },
  cardLabel: {
    ...typography.titleMd,
    color: colors.textPrimary
  },
  cardDesc: {
    ...typography.monoDataSm,
    color: colors.textMuted
  }
})

export default ToolsScreen
