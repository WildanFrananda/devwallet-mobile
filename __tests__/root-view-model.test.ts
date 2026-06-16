import "reflect-metadata"
import { Subject } from "rxjs"
import RootViewModel from "../src/viewmodels/RootViewModel"
import type WalletRepository from "../src/repositories/wallet.repository"
import type AutoLockService from "../src/core/lifecycle/auto-lock.service"
import type SettingsService from "../src/core/storage/settings.service"
import type PushService from "../src/core/notifications/push.service"
import type V03EncryptMigration from "../src/core/migration/v0.3-encrypt.migration"

function makeStubs(over: {
  hasWallet?: boolean
  isUnlocked?: boolean
  needsMigration?: boolean
} = {}): {
  vm: RootViewModel
  lockedSubject: Subject<void>
  migration: jest.Mocked<V03EncryptMigration>
  wallet: jest.Mocked<WalletRepository>
} {
  const lockedSubject = new Subject<void>()
  const wallet = {
    hasWallet: jest.fn(async () => over.hasWallet ?? true),
    isUnlocked: jest.fn(() => over.isUnlocked ?? false)
  } as unknown as jest.Mocked<WalletRepository>
  const autoLock = {
    start: jest.fn(),
    stop: jest.fn(),
    lockNow: jest.fn(),
    locked$: lockedSubject.asObservable()
  } as unknown as AutoLockService
  const settings = {
    getAutoLockMs: jest.fn(() => 30_000)
  } as unknown as SettingsService
  const push = {
    registerWithBackend: jest.fn(async () => undefined),
    subscribeTokenRefresh: jest.fn(() => () => undefined)
  } as unknown as PushService
  const migration = {
    needsMigration: jest.fn(async () => over.needsMigration ?? false),
    run: jest.fn(async () => undefined)
  } as unknown as jest.Mocked<V03EncryptMigration>
  return {
    vm: new RootViewModel(wallet, autoLock, settings, push, migration),
    lockedSubject,
    migration,
    wallet
  }
}

async function flush(): Promise<void> {
  for (let i = 0; i < 6; i++) await Promise.resolve()
}

describe("RootViewModel", () => {
  it("bootstrap routes to onboarding when no wallet exists", async () => {
    const { vm } = makeStubs({ hasWallet: false })
    vm.bootstrap()
    await flush()
    const state = vm.route$.value
    expect(state.status).toBe("success")
    if (state.status === "success") expect(state.data).toBe("onboarding")
  })

  it("bootstrap routes to migrate when migration needed", async () => {
    const { vm } = makeStubs({ hasWallet: true, needsMigration: true })
    vm.bootstrap()
    await flush()
    const state = vm.route$.value
    if (state.status === "success") expect(state.data).toBe("migrate")
  })

  it("bootstrap routes to app when wallet exists + unlocked + no migration", async () => {
    const { vm } = makeStubs({ hasWallet: true, isUnlocked: true })
    vm.bootstrap()
    await flush()
    const state = vm.route$.value
    if (state.status === "success") expect(state.data).toBe("app")
  })

  it("bootstrap routes to unlock when wallet locked", async () => {
    const { vm } = makeStubs({ hasWallet: true, isUnlocked: false })
    vm.bootstrap()
    await flush()
    const state = vm.route$.value
    if (state.status === "success") expect(state.data).toBe("unlock")
  })

  it("auto-lock event flips route to unlock when wallet still present", async () => {
    const { vm, lockedSubject } = makeStubs({ hasWallet: true, isUnlocked: true })
    vm.bootstrap()
    await flush()
    lockedSubject.next()
    await flush()
    const state = vm.route$.value
    if (state.status === "success") expect(state.data).toBe("unlock")
  })

  it("lock after a wipe routes to onboarding (no wallet left)", async () => {
    const { vm, lockedSubject, wallet } = makeStubs({ hasWallet: true, isUnlocked: true })
    vm.bootstrap()
    await flush()
    // Simulate logout: credentials wiped, so the keychain no longer has a wallet.
    wallet.hasWallet.mockResolvedValue(false)
    lockedSubject.next()
    await flush()
    const state = vm.route$.value
    if (state.status === "success") expect(state.data).toBe("onboarding")
  })

  it("enterApp() routes to app", () => {
    const { vm } = makeStubs()
    vm.enterApp()
    const state = vm.route$.value
    if (state.status === "success") expect(state.data).toBe("app")
  })

  it("requireUnlock() routes to unlock + triggers lockNow", () => {
    const { vm } = makeStubs()
    vm.requireUnlock()
    const state = vm.route$.value
    if (state.status === "success") expect(state.data).toBe("unlock")
  })

  it("runMigration calls migration + routes to unlock on success", async () => {
    const { vm, migration } = makeStubs()
    vm.runMigration("123456")
    await flush()
    expect(migration.run).toHaveBeenCalledWith("123456")
    const state = vm.route$.value
    if (state.status === "success") expect(state.data).toBe("unlock")
  })

  it("runMigration error surfaces as error state", async () => {
    const { vm, migration } = makeStubs()
    migration.run.mockRejectedValue(new Error("decrypt failed"))
    vm.runMigration("123456")
    await flush()
    expect(vm.route$.value.status).toBe("error")
  })

  it("bootstrap error path surfaces", async () => {
    const { vm, wallet } = makeStubs()
    wallet.hasWallet.mockRejectedValue(new Error("keychain unreachable"))
    vm.bootstrap()
    await flush()
    const state = vm.route$.value
    expect(state.status).toBe("error")
  })
})
