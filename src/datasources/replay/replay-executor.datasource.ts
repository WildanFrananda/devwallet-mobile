import { Injectable } from "react-native-mobile-mvvm/di"
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { Chain } from "../../core/constants/chains.enum"
import { NetworkRegistry } from "../../core/constants/networks"
import { loggingTransport } from "../../core/network/logging-transport"
import type { DecodedTx } from "../../models/replay.model"

type ExecuteArgs = {
  decoded: DecodedTx
  replayChain: Chain
  /** User's testnet account private key — signing happens on-device. */
  privateKey: string
  /** Override the original `value`. Default 0n (safer for testnet replay). */
  valueOverride?: bigint
}

type ExecuteResult = {
  hash: string
}

const EVM_TESTNETS: ReadonlySet<Chain> = new Set([
  Chain.EVM_SEPOLIA,
  Chain.EVM_POLYGON_AMOY,
  Chain.EVM_BASE_SEPOLIA
])

@Injectable()
class ReplayExecutorDatasource {
  /**
   * Re-broadcast the decoded mainnet tx onto the user-selected EVM
   * testnet. Substitution rules (per spec §5.1):
   *
   *   - `from` → user's testnet address (forced via wallet client)
   *   - `to`   → original target (assuming contract deployed on testnet)
   *   - `data` → original input bytes
   *   - `value` → `valueOverride` (default 0n)
   *   - gas + fees → re-estimated freshly via viem
   */
  public async execute(args: ExecuteArgs): Promise<ExecuteResult> {
    if (!EVM_TESTNETS.has(args.replayChain)) {
      throw new Error(`TX Replay supports EVM testnets only — got ${args.replayChain}`)
    }
    if (!args.decoded.to) {
      throw new Error("TX Replay requires a `to` address (contract creations not supported)")
    }

    const cfg = NetworkRegistry.get(args.replayChain)
    const account = privateKeyToAccount(args.privateKey as Hex)
    const transport = loggingTransport(http(cfg.rpcUrl), args.replayChain, cfg.rpcUrl)
    const walletClient = createWalletClient({ account, chain: undefined, transport })
    const publicClient = createPublicClient({ transport })

    // Sanity: target contract must exist on the testnet, otherwise the
    // tx will revert silently from the user's POV.
    const code = await publicClient.getCode({ address: args.decoded.to as Address })
    if (code === undefined || code === "0x") {
      throw new Error(
        `Target contract ${args.decoded.to} not deployed on ${cfg.symbol} testnet`
      )
    }

    const value = args.valueOverride ?? 0n
    const hash = await walletClient.sendTransaction({
      to: args.decoded.to as Address,
      data: args.decoded.input,
      value,
      chain: null
    })
    return { hash }
  }
}

export default ReplayExecutorDatasource
export type { ExecuteArgs, ExecuteResult }
