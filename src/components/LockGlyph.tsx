import { type JSX } from "react"
import { View, StyleSheet } from "react-native"
import Svg, { Rect, Path } from "react-native-svg"
import { colors, radius, hairline } from "../theme"

type Props = {
  /** Tint — defaults to the indigo accent; pass a warm/semantic hue for variants. */
  color?: string
}

/** Accent-tinted lock chip used across the auth/unlock screens for a warm, on-brand anchor. */
function LockGlyph({ color = colors.accent }: Props): JSX.Element {
  return (
    <View style={[styles.chip, { backgroundColor: color + "1f", borderColor: color + "44" }]}>
      <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
        <Rect x={4.5} y={10.5} width={15} height={10} rx={2.5} stroke={color} strokeWidth={1.8} />
        <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        <Path d="M12 14.5v2.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  chip: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    borderWidth: hairline,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center"
  }
})

export default LockGlyph
