import "reflect-metadata"
import { render } from "@testing-library/react-native"
import MnemonicGrid from "../../src/components/MnemonicGrid"

describe("<MnemonicGrid />", () => {
  it("renders all 12 words with 1-based indices", () => {
    const words = [
      "test", "test", "test", "test", "test", "test",
      "test", "test", "test", "test", "test", "junk"
    ]
    const { getAllByText, getByText } = render(<MnemonicGrid words={words} />)
    expect(getAllByText("test")).toHaveLength(11)
    expect(getByText("junk")).toBeTruthy()
    expect(getByText("1")).toBeTruthy()
    expect(getByText("12")).toBeTruthy()
  })

  it("renders 24-word phrase", () => {
    const words = Array.from({ length: 24 }, (_, i) => `word${i + 1}`)
    const { getByText } = render(<MnemonicGrid words={words} />)
    expect(getByText("word24")).toBeTruthy()
    expect(getByText("24")).toBeTruthy()
  })

  it("handles empty list without crashing", () => {
    const { queryByText } = render(<MnemonicGrid words={[]} />)
    expect(queryByText("1")).toBeNull()
  })

  it("renders highlight indices without throwing", () => {
    const words = ["a", "b", "c", "d", "e", "f"]
    const { getByText } = render(<MnemonicGrid words={words} highlight={[1, 3]} />)
    expect(getByText("b")).toBeTruthy()
    expect(getByText("d")).toBeTruthy()
  })
})
