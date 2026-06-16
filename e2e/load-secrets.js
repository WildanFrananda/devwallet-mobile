/* eslint-disable */
/**
 * Loads e2e/secrets.env (gitignored) into process.env before the send spec runs.
 *
 * Kept dependency-free (no dotenv) — a tiny KEY=VALUE parser. The send spec
 * reads E2E_SEND_MNEMONIC / E2E_SEND_TO from process.env; everything else in
 * the file is ignored. The mnemonic NEVER enters the app binary — only the
 * Node-side Detox runner reads it and types it into the restore screen.
 *
 * If e2e/secrets.env is absent, this is a no-op and send.spec self-skips.
 */
const fs = require("fs")
const path = require("path")

const SECRETS_PATH = path.resolve(__dirname, "secrets.env")

try {
  const raw = fs.readFileSync(SECRETS_PATH, "utf8")
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    // Strip surrounding quotes if present.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (key.length > 0 && process.env[key] === undefined) {
      process.env[key] = value
    }
  }
} catch (err) {
  if (err && err.code !== "ENOENT") throw err
  // No secrets file — send.spec will self-skip.
}
