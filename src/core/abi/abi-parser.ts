import type { AbiKind, ContractFunction } from "../../models/contract.model"

type ParsedAbi = {
  kind: AbiKind
  functions: ReadonlyArray<ContractFunction>
}

/**
 * Detects whether `rawAbi` is an EVM JSON ABI, a Cairo (Starknet) ABI,
 * or an Anchor IDL (Solana) and extracts a unified function list. Root
 * shape is the discriminator: arrays → EVM/Cairo, objects → Anchor.
 */
function parseAbi(rawAbi: string): ParsedAbi {
  const trimmed = rawAbi.trim()
  if (trimmed.length === 0) throw new Error("ABI is empty")
  let json: unknown
  try {
    json = JSON.parse(trimmed)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const wrapped = new Error(`ABI is not valid JSON: ${message}`)
    ;(wrapped as Error & { cause?: unknown }).cause = err
    throw wrapped
  }
  if (Array.isArray(json)) {
    // Cairo ABIs always include an `interface` or `impl` entry — those
    // shapes don't appear in EVM ABIs.
    if (isCairoAbi(json)) {
      return { kind: "starknet", functions: extractCairoFunctions(json) }
    }
    return { kind: "evm", functions: extractEvmFunctions(json) }
  }
  if (json !== null && typeof json === "object" && isAnchorIdl(json as Record<string, unknown>)) {
    return { kind: "solana", functions: extractAnchorFunctions(json as Record<string, unknown>) }
  }
  throw new Error("ABI must be EVM JSON array, Cairo ABI array, or Anchor IDL object")
}

function isCairoAbi(items: ReadonlyArray<unknown>): boolean {
  return items.some(item => {
    if (typeof item !== "object" || item === null) return false
    const t = (item as { type?: string }).type
    return t === "interface" || t === "impl"
  })
}

function extractEvmFunctions(items: ReadonlyArray<unknown>): ReadonlyArray<ContractFunction> {
  const out: ContractFunction[] = []
  for (const item of items) {
    if (typeof item !== "object" || item === null) continue
    const obj = item as Record<string, unknown>
    if (obj.type !== "function") continue
    const name = typeof obj.name === "string" ? obj.name : null
    if (name === null) continue
    const inputs = Array.isArray(obj.inputs) ? obj.inputs.map(coerceParam) : []
    const outputs = Array.isArray(obj.outputs) ? obj.outputs.map(coerceParam) : []
    const sm = typeof obj.stateMutability === "string" ? obj.stateMutability : "nonpayable"
    out.push({
      name,
      inputs,
      outputs,
      stateMutability: normaliseStateMutability(sm)
    })
  }
  return out
}

/**
 * Cairo ABI structure: items live inside `interface.items[]` (one or
 * more interfaces per contract). Each function has `inputs`, `outputs`,
 * and `state_mutability` ("view" or "external").
 */
function extractCairoFunctions(items: ReadonlyArray<unknown>): ReadonlyArray<ContractFunction> {
  const out: ContractFunction[] = []
  for (const item of items) {
    if (typeof item !== "object" || item === null) continue
    const obj = item as Record<string, unknown>
    if (obj.type !== "interface") continue
    const inner = Array.isArray(obj.items) ? obj.items : []
    for (const fn of inner) {
      if (typeof fn !== "object" || fn === null) continue
      const f = fn as Record<string, unknown>
      if (f.type !== "function") continue
      const name = typeof f.name === "string" ? f.name : null
      if (name === null) continue
      const inputs = Array.isArray(f.inputs) ? f.inputs.map(coerceParam) : []
      const outputs = Array.isArray(f.outputs) ? f.outputs.map(coerceParam) : []
      const sm = typeof f.state_mutability === "string" ? f.state_mutability : "external"
      out.push({
        name,
        inputs,
        outputs,
        stateMutability: normaliseStateMutability(sm)
      })
    }
  }
  return out
}

/**
 * Anchor IDL detection: top-level object with `instructions` array. Both
 * legacy `Idl` and the new `IdlAccountsLayout` shapes carry that key.
 */
function isAnchorIdl(obj: Record<string, unknown>): boolean {
  return Array.isArray(obj.instructions)
}

/**
 * Each Anchor instruction becomes one ContractFunction. All instructions
 * are state-changing (`nonpayable`), so we mark them as such — the
 * Contract Terminal Read/Write tab treats them as writes only. Anchor
 * has no concept of "view"; account reads happen via `program.account.X.fetch`
 * which is out of scope for v0.4.
 */
function extractAnchorFunctions(idl: Record<string, unknown>): ReadonlyArray<ContractFunction> {
  const out: ContractFunction[] = []
  const instructions = Array.isArray(idl.instructions) ? idl.instructions : []
  for (const ix of instructions) {
    if (typeof ix !== "object" || ix === null) continue
    const obj = ix as Record<string, unknown>
    const name = typeof obj.name === "string" ? obj.name : null
    if (name === null) continue
    const args = Array.isArray(obj.args) ? obj.args.map(coerceAnchorArg) : []
    out.push({
      name,
      inputs: args,
      outputs: [],
      stateMutability: "nonpayable"
    })
  }
  return out
}

function coerceAnchorArg(raw: unknown): { name: string; type: string } {
  if (typeof raw !== "object" || raw === null) return { name: "", type: "unknown" }
  const o = raw as Record<string, unknown>
  const name = typeof o.name === "string" ? o.name : ""
  // Anchor types can be primitive strings (u64, bool) or nested objects
  // like `{ vec: { defined: "Foo" } }`. Stringify nested cases so the UI
  // can still render the type label.
  const type =
    typeof o.type === "string"
      ? o.type
      : typeof o.type === "object" && o.type !== null
        ? JSON.stringify(o.type)
        : "unknown"
  return { name, type }
}

function coerceParam(raw: unknown): { name: string; type: string } {
  if (typeof raw !== "object" || raw === null) return { name: "", type: "unknown" }
  const o = raw as Record<string, unknown>
  const name = typeof o.name === "string" ? o.name : ""
  const type = typeof o.type === "string" ? o.type : "unknown"
  return { name, type }
}

function normaliseStateMutability(raw: string): ContractFunction["stateMutability"] {
  switch (raw) {
    case "view":
    case "pure":
    case "nonpayable":
    case "payable":
    case "external":
      return raw
    default:
      return "nonpayable"
  }
}

export { parseAbi, type ParsedAbi }
