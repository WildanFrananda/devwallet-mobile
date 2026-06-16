import { type JSX } from "react"
import { StyleSheet, View } from "react-native"
import Svg, { Defs, Pattern, Circle, Rect } from "react-native-svg"
import { colors } from "../theme"

type Props = {
  /** Grid pitch in px. Default 24 — quiet blueprint density. */
  spacing?: number
}

/**
 * Subtle blueprint dot-grid laid behind a screen's content. Fills the dark
 * void without reading as decoration — it's the "engineering paper" texture of
 * a dev tool. Very low contrast (border color, tiny radius). Absolute-fills
 * its parent; render it first inside a flex:1 container, content on top.
 */
function DotGridBackground({ spacing = 24 }: Props): JSX.Element {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="dots" width={spacing} height={spacing} patternUnits="userSpaceOnUse">
            {/* v2: faint indigo-tinted canvas instead of flat gray filler */}
            <Circle cx={1} cy={1} r={1} fill={colors.accent} opacity={0.06} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#dots)" />
      </Svg>
    </View>
  )
}

export default DotGridBackground
