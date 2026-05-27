import { Injectable } from "react-native-mobile-mvvm/di"
import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from "react-native-quick-crypto"
import { Buffer } from "@craftzdog/react-native-buffer"

const PBKDF2_ITERATIONS = 100_000
const KEY_LEN = 32
const SALT_LEN = 32
const IV_LEN = 12
const TAG_LEN = 16

type EncryptedBlob = {
  v: 2
  saltHex: string
  ivHex: string
  ctHex: string
  tagHex: string
}

/**
 * AES-256-GCM symmetric encryption keyed by a PIN-derived key (PBKDF2-
 * SHA256, 100k iter, 32-byte salt). Used by the WalletRepository to wrap
 * the mnemonic before writing it to the keychain — defense in depth on
 * top of the keychain's own at-rest encryption.
 *
 * Output blob format (JSON-serialized string):
 *   { v: 2, saltHex, ivHex, ctHex, tagHex }
 *
 * The v1 format is a plaintext mnemonic string with no JSON wrapper. The
 * WalletRepository migration path detects v1 → re-encrypts → writes v2.
 */
@Injectable()
class SecureStorageService {
  public encrypt(plaintext: string, pin: string): string {
    if (!pin || pin.length === 0) throw new Error("PIN required for encryption")
    const saltBuf = Buffer.from(randomBytes(SALT_LEN))
    const ivBuf = Buffer.from(randomBytes(IV_LEN))
    const keyBuf = Buffer.from(pbkdf2Sync(pin, saltBuf, PBKDF2_ITERATIONS, KEY_LEN, "sha256"))
    const cipher = createCipheriv("aes-256-gcm", keyBuf, ivBuf)
    const ct = Buffer.concat([cipher.update(Buffer.from(plaintext, "utf8")), cipher.final()])
    const tag = cipher.getAuthTag()
    const blob: EncryptedBlob = {
      v: 2,
      saltHex: saltBuf.toString("hex"),
      ivHex: ivBuf.toString("hex"),
      ctHex: ct.toString("hex"),
      tagHex: tag.toString("hex")
    }
    return JSON.stringify(blob)
  }

  public decrypt(blobJson: string, pin: string): string {
    if (!pin || pin.length === 0) throw new Error("PIN required for decryption")
    const blob = SecureStorageService.parse(blobJson)
    const saltBuf = Buffer.from(blob.saltHex, "hex")
    const ivBuf = Buffer.from(blob.ivHex, "hex")
    const ctBuf = Buffer.from(blob.ctHex, "hex")
    const tagBuf = Buffer.from(blob.tagHex, "hex")
    if (tagBuf.length !== TAG_LEN) throw new Error("Invalid auth tag length")
    const keyBuf = Buffer.from(pbkdf2Sync(pin, saltBuf, PBKDF2_ITERATIONS, KEY_LEN, "sha256"))
    const decipher = createDecipheriv("aes-256-gcm", keyBuf, ivBuf)
    decipher.setAuthTag(tagBuf)
    try {
      const plain = Buffer.concat([decipher.update(ctBuf), decipher.final()])
      return plain.toString("utf8")
    } catch {
      // GCM auth failure throws — surface as wrong-PIN to caller.
      throw new Error("Decryption failed — wrong PIN or corrupt blob")
    }
  }

  /** Returns true if the stored value looks like our v2 JSON blob. */
  public isEncryptedBlob(value: string): boolean {
    if (!value.startsWith("{")) return false
    try {
      const parsed = JSON.parse(value) as Partial<EncryptedBlob>
      return parsed.v === 2 && typeof parsed.ctHex === "string"
    } catch {
      return false
    }
  }

  private static parse(blobJson: string): EncryptedBlob {
    const parsed = JSON.parse(blobJson) as Partial<EncryptedBlob>
    if (
      parsed.v !== 2 ||
      typeof parsed.saltHex !== "string" ||
      typeof parsed.ivHex !== "string" ||
      typeof parsed.ctHex !== "string" ||
      typeof parsed.tagHex !== "string"
    ) {
      throw new Error("Unknown encrypted blob format")
    }
    return parsed as EncryptedBlob
  }
}

export default SecureStorageService
