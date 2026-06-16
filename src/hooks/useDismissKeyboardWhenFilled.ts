import { useEffect } from "react"
import { Keyboard } from "react-native"

/**
 * iOS `number-pad` has no return/done key, so a PIN keyboard can't be dismissed
 * manually and ends up covering docked actions. Call this with the current
 * input length; the keyboard is dropped as soon as it reaches `target`.
 *
 *   useDismissKeyboardWhenFilled(pin.length)
 */
export function useDismissKeyboardWhenFilled(length: number, target = 6): void {
  useEffect(() => {
    if (length === target) Keyboard.dismiss()
  }, [length, target])
}
