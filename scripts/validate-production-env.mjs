const fail = (message) => {
  console.error(`Configuration error: ${message}`)
  process.exit(78)
}

if (process.env.NODE_ENV !== "production") fail("NODE_ENV must equal production")
for (const name of ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL", "OPENROUTER_API_KEY", "GOVERNED_OPENROUTER_MODEL", "GOVERNED_SOURCE_KEYS_JSON"]) {
  if (!process.env[name]) fail(`${name} is required`)
}
if (process.env.NEXTAUTH_SECRET.length < 32 || /change|example|placeholder|secret/i.test(process.env.NEXTAUTH_SECRET)) fail("NEXTAUTH_SECRET must be a non-placeholder value of at least 32 characters")
let databaseUrl
let applicationUrl
try {
  databaseUrl = new URL(process.env.DATABASE_URL)
  applicationUrl = new URL(process.env.NEXTAUTH_URL)
} catch {
  fail("DATABASE_URL and NEXTAUTH_URL must be valid URLs")
}
if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol)) fail("DATABASE_URL must use PostgreSQL")
const loopback = ["localhost", "127.0.0.1", "::1"].includes(applicationUrl.hostname)
if (applicationUrl.protocol !== "https:" && !(applicationUrl.protocol === "http:" && loopback)) fail("NEXTAUTH_URL must use HTTPS outside loopback validation")
if (process.env.GOVERNED_EXTERNAL_AI_ACK !== "I_ACKNOWLEDGE_APPROVED_EXTERNAL_DATA_PROCESSING") fail("approved external AI processing must be acknowledged")
let sourceKeys
try {
  sourceKeys = JSON.parse(process.env.GOVERNED_SOURCE_KEYS_JSON)
} catch {
  fail("GOVERNED_SOURCE_KEYS_JSON must be valid JSON")
}
if (!sourceKeys || typeof sourceKeys !== "object" || Array.isArray(sourceKeys) || Object.keys(sourceKeys).length === 0) fail("at least one tenant-bound source key is required")
for (const [keyId, value] of Object.entries(sourceKeys)) {
  if (!/^[A-Za-z0-9._-]{1,80}$/.test(keyId) || !value || typeof value !== "object" || typeof value.agencyId !== "string" || typeof value.key !== "string" || value.key.length < 32) fail("every source key must have a valid key ID, agencyId, and 32+ character key")
}
for (const name of ["GOVERNED_JOBS_PER_MINUTE", "GOVERNED_MAX_ATTEMPTS", "GOVERNED_LEASE_MS", "GOVERNED_SOURCE_MAX_AGE_SECONDS", "GOVERNED_MAX_LATENCY_MS", "GOVERNED_MAX_INPUT_CHARS", "GOVERNED_MAX_COST_MICROS", "GOVERNED_INPUT_COST_MICROS_PER_MILLION", "GOVERNED_OUTPUT_COST_MICROS_PER_MILLION"]) {
  const value = Number(process.env[name])
  if (!Number.isSafeInteger(value) || value < 1) fail(`${name} must be a positive integer`)
}
const confidence = Number(process.env.GOVERNED_MIN_CONFIDENCE)
if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) fail("GOVERNED_MIN_CONFIDENCE must be between zero and one")
console.log("Production configuration passed strict validation.")
