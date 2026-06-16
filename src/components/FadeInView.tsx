import { type JSX, type ReactNode, useEffect, useRef } from "react"
import { Animated, type ViewStyle } from "react-native"
import { duration as motionDuration, easing, stagger } from "../theme"

type Props = {
  children: ReactNode
  /** Entrance delay in ms. Pass `index * stagger` for a list cascade. */
  delay?: number
  /** Lift distance (px) the content travels up into place. */
  translateY?: number
  /** When set, content also scales up from this value (e.g. 0.96 for a soft pop). */
  fromScale?: number
  duration?: number
  style?: ViewStyle | ViewStyle[]
}

/**
 * Mount-once entrance: fades + lifts (and optionally scales) its children into
 * place. RN-core Animated, native-driven. Runs a single time per mount — stable
 * list keys mean it won't re-fire on data refresh.
 */
function FadeInView({ children, delay = 0, translateY = 10, fromScale, duration, style }: Props): JSX.Element {
  const t = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration: duration ?? motionDuration.normal,
      delay,
      easing: easing.out,
      useNativeDriver: true
    }).start()
  }, [t, delay, duration])

  const lift = t.interpolate({ inputRange: [0, 1], outputRange: [translateY, 0] })
  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [fromScale ?? 1, 1] })
  const transform = fromScale !== undefined ? [{ translateY: lift }, { scale }] : [{ translateY: lift }]

  return <Animated.View style={[style, { opacity: t, transform }]}>{children}</Animated.View>
}

export { FadeInView, stagger }
export default FadeInView
