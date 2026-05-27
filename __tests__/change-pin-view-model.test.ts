import "reflect-metadata"

jest.mock("react-native-quick-crypto", () => ({
  pbkdf2Sync: jest.fn(() => Buffer.alloc(32, 1)),
  randomBytes: jest.fn(() => Buffer.alloc(32, 2))
}))

import ChangePinViewModel from "../src/viewmodels/ChangePinViewModel"
import PinService from "../src/core/auth/pin.service"

describe("ChangePinViewModel", () => {
  let pin: { changePin: jest.Mock }
  let vm: ChangePinViewModel

  beforeEach(() => {
    pin = { changePin: jest.fn().mockResolvedValue(undefined) }
    vm = new ChangePinViewModel(pin as unknown as PinService)
  })

  it("rejects empty current PIN advance", () => {
    vm.advance()
    expect(vm.save$.value.status).toBe("error")
    expect(vm.stage$.value).toBe("current")
  })

  it("3-stage happy path: current → new → confirm → save", async () => {
    vm.setCurrentPin("123456")
    vm.advance()
    expect(vm.stage$.value).toBe("new")

    vm.setNewPin("654321")
    vm.advance()
    expect(vm.stage$.value).toBe("confirm")

    vm.setConfirmPin("654321")
    vm.advance()
    await new Promise(r => setTimeout(r, 20))

    expect(pin.changePin).toHaveBeenCalledWith("123456", "654321")
    expect(vm.save$.value.status).toBe("success")
  })

  it("rejects when new PIN equals current", () => {
    vm.setCurrentPin("123456")
    vm.advance()
    vm.setNewPin("123456")
    vm.advance()
    expect(vm.save$.value.status).toBe("error")
    expect(vm.stage$.value).toBe("new")
  })

  it("rejects when confirm doesn't match new", () => {
    vm.setCurrentPin("123456")
    vm.advance()
    vm.setNewPin("654321")
    vm.advance()
    vm.setConfirmPin("111111")
    vm.advance()
    expect(vm.save$.value.status).toBe("error")
    expect(vm.stage$.value).toBe("confirm")
  })

  it("back from confirm → new clears confirmPin", () => {
    vm.setCurrentPin("123456")
    vm.advance()
    vm.setNewPin("654321")
    vm.advance()
    vm.setConfirmPin("654321")
    vm.back()
    expect(vm.stage$.value).toBe("new")
    expect(vm.confirmPin$.value).toBe("")
  })

  it("wrong current PIN: pin.changePin throws → resets to current stage", async () => {
    pin.changePin.mockRejectedValue(new Error("Current PIN does not match"))
    vm.setCurrentPin("999999")
    vm.advance()
    vm.setNewPin("654321")
    vm.advance()
    vm.setConfirmPin("654321")
    vm.advance()
    await new Promise(r => setTimeout(r, 20))

    expect(vm.save$.value.status).toBe("error")
    expect(vm.stage$.value).toBe("current")
    expect(vm.currentPin$.value).toBe("")
  })

  it("sanitizes non-digit input", () => {
    vm.setCurrentPin("1a2b3c4d5e6f")
    expect(vm.currentPin$.value).toBe("123456")
  })
})
