import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { randomUUID } from "node:crypto"
import test from "node:test"
import { canonicalJson, hmacSha256, sha256, verifySignedSync } from "../src/lib/governed-ai/security"
import { retrieveDocuments } from "../src/lib/governed-ai/retrieval"
import { GovernedError } from "../src/lib/governed-ai/errors"

test("canonical JSON and hashing are deterministic", () => {
  const left = canonicalJson({ z: [2, { b: true, a: "x" }], a: 1 })
  const right = canonicalJson({ a: 1, z: [2, { a: "x", b: true }] })
  assert.equal(left, right)
  assert.equal(sha256(left), sha256(right))
})

test("signed source sync verifies tenant, timestamp, body, and replay identity", () => {
  const agencyId = randomUUID()
  const key = "test-source-signing-key-at-least-thirty-two-characters"
  const keyId = "tenant-a-key"
  const eventId = "source-event-0001"
  const timestamp = new Date().toISOString()
  const rawBody = JSON.stringify({
    agencyId,
    cursor: "cursor-1",
    documents: [{
      externalId: "handbook/onboarding",
      title: "Customer onboarding handbook",
      content: "Use the verified customer onboarding checklist and record reviewer approval.",
      allowedRoles: ["CONTRIBUTOR", "REVIEWER"],
      sourceUpdatedAt: timestamp,
      deleted: false,
    }],
  })
  const requestHash = sha256(rawBody)
  const signature = hmacSha256(key, `${timestamp}.${eventId}.${requestHash}`)
  const verified = verifySignedSync(rawBody, {
    "x-governed-event-id": eventId,
    "x-governed-key-id": keyId,
    "x-governed-timestamp": timestamp,
    "x-governed-signature": signature,
  }, { [keyId]: { agencyId, key } })
  assert.equal(verified.input.agencyId, agencyId)
  assert.equal(verified.requestHash, requestHash)

  assert.throws(() => verifySignedSync(`${rawBody} `, {
    "x-governed-event-id": eventId,
    "x-governed-key-id": keyId,
    "x-governed-timestamp": timestamp,
    "x-governed-signature": signature,
  }, { [keyId]: { agencyId, key } }), (error: unknown) => error instanceof GovernedError && error.code === "INVALID_SYNC_SIGNATURE")

  const staleTimestamp = new Date(Date.now() - 10 * 60_000).toISOString()
  assert.throws(() => verifySignedSync(rawBody, {
    "x-governed-event-id": eventId,
    "x-governed-key-id": keyId,
    "x-governed-timestamp": staleTimestamp,
    "x-governed-signature": hmacSha256(key, `${staleTimestamp}.${eventId}.${requestHash}`),
  }, { [keyId]: { agencyId, key } }), (error: unknown) => error instanceof GovernedError && error.code === "STALE_SYNC_SIGNATURE")
})

test("retrieval is deterministic and permission-aware", () => {
  const now = new Date()
  const documents = [
    { id: randomUUID(), title: "Customer onboarding", content: "A verified onboarding checklist with owner review.", contentHash: "a".repeat(64), sourceUpdatedAt: now, allowedRoles: ["CONTRIBUTOR"] as const },
    { id: randomUUID(), title: "Private finance", content: "Customer onboarding finance approval.", contentHash: "b".repeat(64), sourceUpdatedAt: now, allowedRoles: ["REVIEWER"] as const },
    { id: randomUUID(), title: "Unrelated", content: "Nothing about the requested domain.", contentHash: "c".repeat(64), sourceUpdatedAt: now, allowedRoles: ["CONTRIBUTOR"] as const },
  ]
  const contributor = retrieveDocuments("customer onboarding checklist", documents.map((document) => ({ ...document, allowedRoles: [...document.allowedRoles] })), "CONTRIBUTOR")
  assert.deepEqual(contributor.map((document) => document.id), [documents[0].id])
  const owner = retrieveDocuments("customer onboarding", documents.map((document) => ({ ...document, allowedRoles: [...document.allowedRoles] })), "OWNER")
  assert.deepEqual(owner.map((document) => document.id), [documents[0].id, documents[1].id])
})

test("unsafe lifecycle helpers fail closed and production config validates strictly", () => {
  const blocked = spawnSync(process.execPath, ["scripts/blocked-command.mjs", "db:reset"], { encoding: "utf8" })
  assert.equal(blocked.status, 78)
  const missing = spawnSync(process.execPath, ["scripts/validate-production-env.mjs"], { encoding: "utf8", env: { PATH: process.env.PATH || "", NODE_ENV: "test" } as NodeJS.ProcessEnv })
  assert.equal(missing.status, 78)

  const valid = spawnSync(process.execPath, ["scripts/validate-production-env.mjs"], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH || "",
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://user:password@database.internal:5432/app?sslmode=require",
      NEXTAUTH_URL: "https://governed.example.test",
      NEXTAUTH_SECRET: "a-valid-random-value-with-more-than-thirty-two-characters",
      OPENROUTER_API_KEY: "test-provider-value-not-used-for-a-network-call",
      GOVERNED_OPENROUTER_MODEL: "approved/model",
      GOVERNED_EXTERNAL_AI_ACK: "I_ACKNOWLEDGE_APPROVED_EXTERNAL_DATA_PROCESSING",
      GOVERNED_SOURCE_KEYS_JSON: JSON.stringify({ key1: { agencyId: randomUUID(), key: "a-source-key-with-more-than-thirty-two-characters" } }),
      GOVERNED_JOBS_PER_MINUTE: "10",
      GOVERNED_MAX_ATTEMPTS: "3",
      GOVERNED_LEASE_MS: "30000",
      GOVERNED_SOURCE_MAX_AGE_SECONDS: "86400",
      GOVERNED_MAX_LATENCY_MS: "10000",
      GOVERNED_MAX_INPUT_CHARS: "30000",
      GOVERNED_MAX_COST_MICROS: "100000",
      GOVERNED_INPUT_COST_MICROS_PER_MILLION: "250000",
      GOVERNED_OUTPUT_COST_MICROS_PER_MILLION: "1000000",
      GOVERNED_MIN_CONFIDENCE: "0.65",
    },
  })
  assert.equal(valid.status, 0, valid.stderr)
})
