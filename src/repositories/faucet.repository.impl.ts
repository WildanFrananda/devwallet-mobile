import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import { defer, from, Observable, switchMap } from "rxjs"
import FaucetRepository from "./faucet.repository"
import FaucetRequest from "../models/faucet-request.model"
import FaucetDatasource, { type StatusResponse } from "../datasources/faucet/faucet.datasource"
import FaucetWsClient, { type FaucetEvent } from "../datasources/faucet/faucet-ws.client"
import DeviceFingerprintService from "../core/auth/device-fingerprint.service"
import { Chain } from "../core/constants/chains.enum"
import { Tokens } from "../core/di/tokens"

@Injectable()
class FaucetRepositoryImpl extends FaucetRepository {
  private readonly ws = new FaucetWsClient()

  public constructor(
    @Inject(Tokens.FaucetDatasource) private readonly api: FaucetDatasource,
    @Inject(Tokens.DeviceFingerprint) private readonly fingerprint: DeviceFingerprintService
  ) {
    super()
  }

  public override async enqueue(addresses: Partial<Record<Chain, string>>): Promise<FaucetRequest[]> {
    const fp = await this.fingerprint.get()
    const result = await this.api.enqueue(addresses, fp)
    return result.jobs.map(job =>
      new FaucetRequest({
        id: job.requestId,
        chain: job.chain as Chain,
        address: addresses[job.chain as Chain] ?? "",
        status: "pending",
        txHash: null,
        amount: null,
        errorMessage: null,
        manualUrl: null,
        completedAt: null
      })
    )
  }

  public override async fetchStatus(requestId: string): Promise<FaucetRequest> {
    const row = await this.api.status(requestId)
    return FaucetRepositoryImpl.toModel(row)
  }

  public override events$(): Observable<FaucetEvent> {
    return defer(() => from(this.fingerprint.get())).pipe(switchMap(fp => this.ws.connect(fp)))
  }

  private static toModel(row: StatusResponse): FaucetRequest {
    return new FaucetRequest({
      id: row.id,
      chain: row.chain as Chain,
      address: row.address,
      status: row.status,
      txHash: row.tx_hash,
      amount: row.amount,
      errorMessage: row.error_msg,
      manualUrl: row.manual_url,
      completedAt: row.completed_at ? new Date(row.completed_at) : null
    })
  }
}

export default FaucetRepositoryImpl
