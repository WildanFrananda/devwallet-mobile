import { Injectable } from "react-native-mobile-mvvm/di"
import {
  createPublicClient,
  decodeFunctionData,
  http,
  parseAbi,
  type Abi,
  type Hex
} from "viem"
import { Chain } from "../../core/constants/chains.enum"
import { sourceFor } from "../../core/constants/replay-sources"
import { loggingTransport } from "../../core/network/logging-transport"
import type { DecodedArg, DecodedTx, ReplayOriginChain } from "../../models/replay.model"

/**
 * Minimal "4byte directory" — common verified function selectors used
 * in everyday EVM tx (ERC-20, ERC-721, Uniswap, etc.). Sufficient for
 * the Phase 4 demo path. Expand later by adding parsed signatures.
 */
const COMMON_ABI: Abi = parseAbi([
  "function transfer(address to, uint256 amount)",
  "function transferFrom(address from, address to, uint256 amount)",
  "function approve(address spender, uint256 amount)",
  "function mint(address to, uint256 amount)",
  "function burn(uint256 amount)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)",
  "function deposit()",
  "function withdraw(uint256 amount)",
  "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline)",
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96))"
])

@Injectable()
class ReplayDecoderDatasource {
  /**
   * Fetch + decode a mainnet tx. Uses the read-only public RPC for the
   * origin chain. Optional `extraAbi` lets the user paste a verified ABI
   * to decode otherwise-unknown functions.
   */
  public async fetchAndDecode(
    origin: ReplayOriginChain,
    txHash: string,
    extraAbi: Abi | null = null
  ): Promise<DecodedTx> {
    const cfg = sourceFor(origin)
    // Map origin to a Chain-like value for the log sink (we record under
    // the testnet pair for now so the user can find it in the inspector).
    const logChain: Chain = cfg.testnetPair
    // Bounded timeout + retries: public mainnet RPCs advertise HTTP/3, and the
    // iOS Simulator's QUIC stack can stall the first connection. A short
    // per-attempt timeout lets the retry fall back to HTTP/2 instead of leaving
    // the UI spinning forever. (Real devices don't hit this.)
    const client = createPublicClient({
      transport: loggingTransport(
        http(cfg.rpcUrl, { timeout: 8_000, retryCount: 3, retryDelay: 500 }),
        logChain,
        cfg.rpcUrl
      )
    })

    const tx = await client.getTransaction({ hash: txHash as Hex })
    const input = tx.input ?? "0x"

    const decoded = this.decodeInput(input, extraAbi)
    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      input,
      functionName: decoded?.name ?? null,
      args: decoded?.args ?? [],
      matchedAbi: decoded?.matchedAbi ?? null
    }
  }

  /**
   * Decode input data against a bundled common ABI first; fall back to
   * the user-supplied ABI when present. Returns null when no signature
   * matches — caller renders the raw bytes in that case.
   */
  public decodeInput(
    input: `0x${string}`,
    extraAbi: Abi | null
  ): { name: string; args: ReadonlyArray<DecodedArg>; matchedAbi: string } | null {
    if (input === "0x" || input.length < 10) return null
    const candidates: ReadonlyArray<{ abi: Abi; label: string }> = [
      { abi: COMMON_ABI, label: "common" },
      ...(extraAbi ? [{ abi: extraAbi, label: "user" }] : [])
    ]
    for (const candidate of candidates) {
      try {
        const result = decodeFunctionData({ abi: candidate.abi, data: input })
        const fnAbi = candidate.abi.find(
          (entry): entry is Extract<Abi[number], { type: "function" }> =>
            entry.type === "function" && entry.name === result.functionName
        )
        if (!fnAbi) continue
        const args = fnAbi.inputs.map((paramAbi, i) => {
          const raw = (result.args as ReadonlyArray<unknown>)[i]
          return {
            name: paramAbi.name ?? `arg${i}`,
            type: paramAbi.type,
            value: this.stringify(raw)
          }
        })
        return { name: result.functionName, args, matchedAbi: candidate.label }
      } catch {
        // try next candidate
      }
    }
    return null
  }

  private stringify(raw: unknown): string {
    if (typeof raw === "bigint") return raw.toString()
    if (Array.isArray(raw)) return JSON.stringify(raw.map(v => this.stringifyRaw(v)))
    if (typeof raw === "object" && raw !== null) {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(raw)) out[k] = this.stringifyRaw(v)
      return JSON.stringify(out)
    }
    return String(raw)
  }

  private stringifyRaw(raw: unknown): unknown {
    if (typeof raw === "bigint") return raw.toString()
    return raw
  }
}

export default ReplayDecoderDatasource
