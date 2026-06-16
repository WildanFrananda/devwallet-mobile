import { type JSX } from "react"
import { View, Text, Pressable, StyleSheet } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs"
import Svg, { Path, Rect, Circle, Line } from "react-native-svg"
import { colors, typography, spacing, radius, hairline } from "../theme"

type IconProps = { color: string }

/** Minimal stroke icons — dev-tool line style, no fills. */
function WalletIcon({ color }: IconProps): JSX.Element {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={6} width={18} height={13} rx={2.5} stroke={color} strokeWidth={1.6} />
      <Path d="M3 10h18" stroke={color} strokeWidth={1.6} />
      <Circle cx={16.5} cy={14.5} r={1.2} fill={color} />
    </Svg>
  )
}

function FaucetIcon({ color }: IconProps): JSX.Element {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3c0 5-4 7-4 11a4 4 0 0 0 8 0c0-4-4-6-4-11z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ToolsIcon({ color }: IconProps): JSX.Element {
  // terminal chevron — > _
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={4} width={18} height={16} rx={2.5} stroke={color} strokeWidth={1.6} />
      <Path d="M7 9l3 3-3 3" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1={12.5} y1={15} x2={17} y2={15} stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  )
}

function SettingsIcon({ color }: IconProps): JSX.Element {
  // sliders
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Line x1={4} y1={8} x2={20} y2={8} stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1={4} y1={16} x2={20} y2={16} stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Circle cx={9} cy={8} r={2.4} fill={colors.background} stroke={color} strokeWidth={1.6} />
      <Circle cx={15} cy={16} r={2.4} fill={colors.background} stroke={color} strokeWidth={1.6} />
    </Svg>
  )
}

const ICONS: Record<string, (p: IconProps) => JSX.Element> = {
  Wallet: WalletIcon,
  Faucet: FaucetIcon,
  Tools: ToolsIcon,
  Settings: SettingsIcon
}

/**
 * Custom dark tab bar — hairline top border (no shadow), SVG line icons, mono
 * uppercase labels, indigo active state with a short indicator bar above the
 * active tab. Matches the Linear-restraint design system.
 */
function TabBar({ state, descriptors, navigation }: BottomTabBarProps): JSX.Element {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index
        const color = focused ? colors.accentText : colors.textMuted
        const Icon = ICONS[route.name]
        const testID = descriptors[route.key]?.options.tabBarButtonTestID

        const onPress = (): void => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true })
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name)
        }

        return (
          <Pressable key={route.key} testID={testID} style={styles.tab} onPress={onPress}>
            <View style={[styles.indicator, focused && styles.indicatorOn]} />
            {Icon ? <Icon color={color} /> : null}
            <Text style={[styles.label, focused && styles.labelOn]}>{route.name.toUpperCase()}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderTopWidth: hairline,
    borderTopColor: colors.border,
    paddingTop: spacing.sm
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
    paddingTop: spacing.xs
  },
  indicator: {
    position: "absolute",
    top: 0,
    width: 20,
    height: 2,
    borderRadius: radius.full,
    backgroundColor: colors.transparent
  },
  indicatorOn: {
    backgroundColor: colors.accent
  },
  label: {
    ...typography.monoLabelSm,
    fontSize: 9,
    color: colors.textMuted
  },
  labelOn: {
    color: colors.accentText
  }
})

export default TabBar
