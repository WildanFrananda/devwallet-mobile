/**
 * Pure formatting helpers — no business logic, no async, no state.
 * Safe to call from anywhere (component, VM, snapshot test).
 */

function truncateAddress(address: string, head: number = 6, tail: number = 4): string {
  if (address.length <= head + tail + 3) return address
  return `${address.slice(0, head)}…${address.slice(-tail)}`
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return "—"
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  return `${Math.floor(diffSec / 86400)}d ago`
}

function formatNativeAmount(raw: bigint, decimals: number, symbol: string, fractionDigits: number = 6): string {
  const sign = raw < 0n ? "-" : ""
  const abs = raw < 0n ? -raw : raw
  const base = 10n ** BigInt(decimals)
  const whole = abs / base
  const frac = abs % base
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "")
  const amount = fracStr.length > 0 ? `${whole}.${fracStr.slice(0, fractionDigits)}` : whole.toString()
  return `${sign}${amount} ${symbol}`
}

export { truncateAddress, formatRelativeTime, formatNativeAmount }
