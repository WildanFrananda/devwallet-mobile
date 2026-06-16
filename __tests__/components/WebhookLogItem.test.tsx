import "reflect-metadata"
import { render } from "@testing-library/react-native"
import WebhookLogItem from "../../src/components/WebhookLogItem"
import WebhookLog from "../../src/models/webhook-log.model"

function makeLog(over: Partial<ConstructorParameters<typeof WebhookLog>[0]> = {}): WebhookLog {
  return new WebhookLog({
    id: "lg-1",
    webhookId: "wh-1",
    blockNumber: "12345678",
    txHash: "0xdeadbeef",
    logIndex: 0,
    decodedArgs: { from: "0x1111", to: "0x2222", value: "1000" },
    firedAt: new Date("2026-02-01T10:00:00Z"),
    ...over
  })
}

describe("<WebhookLogItem />", () => {
  it("renders the block number and tx hash", () => {
    const { getByText } = render(<WebhookLogItem log={makeLog()} />)
    expect(getByText("block 12345678")).toBeTruthy()
    expect(getByText("0xdeadbeef")).toBeTruthy()
  })

  it("renders the decoded args as pretty JSON", () => {
    const { getByText } = render(<WebhookLogItem log={makeLog()} />)
    expect(getByText(/"from": "0x1111"/)).toBeTruthy()
  })

  it("omits the tx hash line when absent and shows a '?' block fallback", () => {
    const { queryByText, getByText } = render(
      <WebhookLogItem log={makeLog({ txHash: null, blockNumber: null })} />
    )
    expect(queryByText("0xdeadbeef")).toBeNull()
    expect(getByText("block ?")).toBeTruthy()
  })

  it("forwards a testID for E2E targeting", () => {
    const { getByTestId } = render(<WebhookLogItem log={makeLog()} testID="webhook-detail.log-row.0" />)
    expect(getByTestId("webhook-detail.log-row.0")).toBeTruthy()
  })
})
