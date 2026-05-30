import { Inject, Injectable } from "react-native-mobile-mvvm/di"
import { createMMKV } from "react-native-mmkv"
import KeychainService from "../storage/keychain.service"
import SecureStorageService from "../auth/secure-storage.service"
import { Tokens } from "../di/tokens"

type MMKVHandle = ReturnType<typeof createMMKV>

const MIGRATION_FLAG = "migration.v0.3.complete"

/**
 * Migrates a v0.2.x install (plaintext mnemonic in the keychain) to the
 * v0.3 encrypted blob format. Atomic flow:
 *
 *   1. Read the legacy raw value from the mnemonic row.
 *   2. If it already parses as a v2 blob, set the flag and exit.
 *   3. Encrypt the plaintext with the user-supplied PIN.
 *   4. Write the new blob to the staging row (`mnemonic.v2`).
 *   5. Decrypt-verify round-trip the staged blob.
 *   6. Promote the staged blob to the primary row, clear staging.
 *   7. Store the PIN in the biometric-cached row.
 *   8. Mark the migration flag in MMKV so subsequent boots short-circuit.
 *
 * If any step fails the legacy plaintext row is left untouched, so the
 * user can retry on the next boot.
 */
@Injectable()
class V03EncryptMigration {
  private cached: MMKVHandle | null = null

  public constructor(
    @Inject(Tokens.Keychain) private readonly keychain: KeychainService,
    @Inject(Tokens.SecureStorage) private readonly secureStorage: SecureStorageService
  ) {}

  /** Cheap check used by the UI to decide whether to show the upgrade modal. */
  public async needsMigration(): Promise<boolean> {
    if (this.storage().getBoolean(MIGRATION_FLAG)) return false
    const raw = await this.keychain.getMnemonic("Migration check")
    if (raw === null) return false
    if (this.secureStorage.isEncryptedBlob(raw)) {
      // Already migrated by a previous boot — record and exit silently.
      this.storage().set(MIGRATION_FLAG, true)
      return false
    }
    return true
  }

  /**
   * Run the migration. Throws on any failure so the caller can re-prompt
   * the user. The legacy plaintext mnemonic is preserved on failure.
   */
  public async run(pin: string): Promise<void> {
    if (this.storage().getBoolean(MIGRATION_FLAG)) return
    const raw = await this.keychain.getMnemonic("Authenticate to upgrade security")
    if (raw === null) return
    if (this.secureStorage.isEncryptedBlob(raw)) {
      this.storage().set(MIGRATION_FLAG, true)
      return
    }

    const blob = this.secureStorage.encrypt(raw, pin)

    // Step 4: stage. If a previous run crashed mid-flight the stale staging
    // row gets overwritten cleanly.
    await this.keychain.setMnemonicStaging(blob)

    // Step 5: verify the staged blob actually decrypts to the original
    // plaintext under the same PIN.
    let verified: string
    try {
      verified = this.secureStorage.decrypt(blob, pin)
    } catch (err) {
      await this.keychain.clearMnemonicStaging()
      const message = err instanceof Error ? err.message : String(err)
      const wrapped = new Error(`Migration verify decrypt failed: ${message}`)
      ;(wrapped as Error & { cause?: unknown }).cause = err
      throw wrapped
    }
    if (verified !== raw) {
      await this.keychain.clearMnemonicStaging()
      throw new Error("Migration verify mismatch — staged blob does not round-trip")
    }

    // Step 6: promote staged blob to primary mnemonic row. The keychain
    // overwrite is atomic at the OS layer, so we cannot get a split-brain
    // where both rows contain different mnemonics.
    await this.keychain.setMnemonic(blob, false)
    await this.keychain.clearMnemonicStaging()

    // Step 7: cache PIN for biometric unlock.
    await this.keychain.setCachedPin(pin)

    // Step 8: mark done.
    this.storage().set(MIGRATION_FLAG, true)
  }

  /** Test-only — wipes the migration flag so the next boot re-runs. */
  public reset(): void {
    this.storage().set(MIGRATION_FLAG, false)
  }

  private storage(): MMKVHandle {
    if (!this.cached) {
      this.cached = createMMKV({ id: "devwallet.migration" })
    }
    return this.cached
  }
}

export default V03EncryptMigration
