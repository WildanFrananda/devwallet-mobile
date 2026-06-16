import { type JSX, useEffect, useRef, useState } from "react"
import { Animated, Text, type TextStyle } from "react-native"
import { easing } from "../theme"

type Props = {
  /** The target value. `null` renders `nullText` and resets the animation. */
  value: number | null
  style?: TextStyle | TextStyle[]
  /** Shown while value is null (e.g. before the portfolio loads). */
  nullText?: string
  /** Format the animated number into display text. Defaults to USD with 2dp. */
  format?: (n: number) => string
  durationMs?: number
}

function defaultFormat(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Tween a number from its previous value to the new one and render the running
 * total — the Dashboard portfolio "count-up". JS-driven (we read each frame),
 * which is fine for a single text node.
 */
function CountUpText({ value, style, nullText = "$ —", format = defaultFormat, durationMs = 700 }: Props): JSX.Element {
  const anim = useRef(new Animated.Value(0)).current
  const last = useRef<number>(0)
  const [display, setDisplay] = useState<string>(value === null ? nullText : format(value))

  useEffect(() => {
    if (value === null) {
      setDisplay(nullText)
      return
    }
    const id = anim.addListener(({ value: v }) => setDisplay(format(v)))
    anim.setValue(last.current)
    const run = Animated.timing(anim, {
      toValue: value,
      duration: durationMs,
      easing: easing.out,
      useNativeDriver: false
    })
    run.start(() => {
      last.current = value
      setDisplay(format(value))
    })
    return () => {
      anim.removeListener(id)
      run.stop()
    }
  }, [value, anim, format, nullText, durationMs])

  return <Text style={style}>{display}</Text>
}

export default CountUpText
