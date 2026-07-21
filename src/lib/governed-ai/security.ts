import { createHash, createHmac, timingSafeEqual } from "node:crypto"
import { GovernedError } from "./errors"
import { sourceSyncSchema, type SourceSyncInput } from "./contracts"

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
    .join(",")}}`
}

export function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex")
}

export function hmacSha256(key: string, value: string): string {
  return createHmac("sha256", key).update(value).digest("hex")
}

function equalHex(left: string, right: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) return false
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"))
}

export interface SourceSigningKey {
  agencyId: string
  key: string
}

export function sourceSigningKeysFromEnvironment(): Record<string, SourceSigningKey> {
  const raw = process.env.GOVERNED_SOURCE_KEYS_JSON
  if (!raw) throw new GovernedError("SOURCE_KEYS_UNAVAILABLE", "Source sync keys are not configured.", 503)
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new GovernedError("SOURCE_KEYS_INVALID", "Source sync key configuration is invalid.", 503)
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new GovernedError("SOURCE_KEYS_INVALID", "Source sync key configuration is invalid.", 503)
  }
  const result: Record<string, SourceSigningKey> = {}
  for (const [keyId, candidate] of Object.entries(parsed as Record<string, unknown>)) {
    if (!/^[A-Za-z0-9._-]{1,80}$/.test(keyId) || !candidate || typeof candidate !== "object") {
      throw new GovernedError("SOURCE_KEYS_INVALID", "Source sync key configuration is invalid.", 503)
    }
    const { agencyId, key } = candidate as Record<string, unknown>
    if (typeof agencyId !== "string" || typeof key !== "string" || key.length < 32) {
      throw new GovernedError("SOURCE_KEYS_INVALID", "Source sync keys must be tenant-bound and at least 32 characters.", 503)
    }
    result[keyId] = { agencyId, key }
  }
  return result
}

export interface VerifiedSync {
  input: SourceSyncInput
  eventId: string
  keyId: string
  requestHash: string
  sourceTimestamp: Date
}

export function verifySignedSync(
  rawBody: string,
  headers: Record<string, string | null>,
  keys: Record<string, SourceSigningKey> = sourceSigningKeysFromEnvironment(),
  now = new Date(),
): VerifiedSync {
  const eventId = headers["x-governed-event-id"]?.trim() || ""
  const keyId = headers["x-governed-key-id"]?.trim() || ""
  const timestamp = headers["x-governed-timestamp"]?.trim() || ""
  const signature = headers["x-governed-signature"]?.trim() || ""
  if (!/^[A-Za-z0-9._:-]{8,160}$/.test(eventId) || !/^[A-Za-z0-9._-]{1,80}$/.test(keyId)) {
    throw new GovernedError("INVALID_SYNC_HEADERS", "Signed sync headers are missing or invalid.", 401)
  }
  const sourceTimestamp = new Date(timestamp)
  if (!timestamp || Number.isNaN(sourceTimestamp.getTime())) {
    throw new GovernedError("INVALID_SYNC_TIMESTAMP", "The source timestamp is invalid.", 401)
  }
  const skewMs = Math.abs(now.getTime() - sourceTimestamp.getTime())
  if (skewMs > 5 * 60 * 1_000) {
    throw new GovernedError("STALE_SYNC_SIGNATURE", "The source signature is outside the five-minute window.", 401)
  }
  const key = keys[keyId]
  if (!key) throw new GovernedError("UNKNOWN_SYNC_KEY", "The source signing key is unknown.", 401)
  const requestHash = sha256(rawBody)
  const expected = hmacSha256(key.key, `${timestamp}.${eventId}.${requestHash}`)
  if (!equalHex(signature, expected)) {
    throw new GovernedError("INVALID_SYNC_SIGNATURE", "The source signature is invalid.", 401)
  }
  let candidate: unknown
  try {
    candidate = JSON.parse(rawBody)
  } catch {
    throw new GovernedError("INVALID_SYNC_BODY", "The source payload is not valid JSON.", 400)
  }
  const input = sourceSyncSchema.parse(candidate)
  if (input.agencyId !== key.agencyId) {
    throw new GovernedError("SYNC_TENANT_MISMATCH", "The signing key is not authorized for this tenant.", 403)
  }
  return { input, eventId, keyId, requestHash, sourceTimestamp }
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin")
  const configured = process.env.NEXTAUTH_URL
  if (!origin || !configured) throw new GovernedError("ORIGIN_REQUIRED", "A configured same-origin request is required.", 403)
  let expected: string
  try {
    expected = new URL(configured).origin
  } catch {
    throw new GovernedError("SERVER_ORIGIN_INVALID", "The configured application origin is invalid.", 503)
  }
  if (origin !== expected) throw new GovernedError("ORIGIN_REJECTED", "Cross-origin mutation is not allowed.", 403)
}
