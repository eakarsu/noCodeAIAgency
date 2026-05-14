/**
 * Shared AI helpers — parseAIJson + aiRateLimiter + encryption envelope.
 */

import crypto from 'crypto'

// ============= JSON Parser =============
export function parseAIJson<T = unknown>(text: string): T | null {
  if (!text) return null
  try {
    return JSON.parse(text) as T
  } catch {}
  try {
    const stripped = text.replace(/```(?:json)?\n?/gi, '').replace(/```/g, '').trim()
    return JSON.parse(stripped) as T
  } catch {}
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1)) as T
    } catch {}
  }
  return null
}

// ============= Rate Limiter =============
type Bucket = { hits: number[] }
const buckets = new Map<string, Bucket>()
const DEFAULT_LIMIT = parseInt(process.env.AI_RATE_LIMIT_PER_HOUR || '20', 10)
const WINDOW_MS = 60 * 60 * 1000

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  limit: number
}

export function aiRateLimiter(userId: string, limit = DEFAULT_LIMIT): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(userId) || { hits: [] }
  bucket.hits = bucket.hits.filter((t) => now - t < WINDOW_MS)
  if (bucket.hits.length >= limit) {
    return { allowed: false, remaining: 0, resetAt: new Date(bucket.hits[0] + WINDOW_MS), limit }
  }
  bucket.hits.push(now)
  buckets.set(userId, bucket)
  return { allowed: true, remaining: limit - bucket.hits.length, resetAt: new Date(now + WINDOW_MS), limit }
}

// ============= Envelope encryption for credentials =============
/**
 * AES-256-GCM envelope encryption for Integration.credentials.
 * Set CREDENTIALS_KEY (base64-encoded 32-byte key) in your env.
 *
 * Encrypted format: "v1:<iv-b64>:<authTag-b64>:<ciphertext-b64>"
 * Plaintext fallback: rows that don't match the v1: prefix are returned as-is
 * so existing data is never broken.
 */
const ALG = 'aes-256-gcm'
function getKey(): Buffer | null {
  const raw = process.env.CREDENTIALS_KEY
  if (!raw) return null
  try {
    const k = Buffer.from(raw, 'base64')
    if (k.length !== 32) return null
    return k
  } catch {
    return null
  }
}

export function encryptCredential(value: string): string {
  const key = getKey()
  if (!key || !value) return value
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALG, key, iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`
}

export function decryptCredential(value: string): string {
  if (!value || !value.startsWith('v1:')) return value
  const key = getKey()
  if (!key) return value // can't decrypt; return as-is
  const [, ivB64, tagB64, ctB64] = value.split(':')
  try {
    const iv = Buffer.from(ivB64, 'base64')
    const tag = Buffer.from(tagB64, 'base64')
    const ct = Buffer.from(ctB64, 'base64')
    const decipher = crypto.createDecipheriv(ALG, key, iv)
    decipher.setAuthTag(tag)
    const pt = Buffer.concat([decipher.update(ct), decipher.final()])
    return pt.toString('utf8')
  } catch {
    return ''
  }
}

export function encryptCredentialsObject(creds: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(creds || {})) {
    out[k] = typeof v === 'string' ? encryptCredential(v) : v
  }
  return out
}

export function decryptCredentialsObject(creds: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(creds || {})) {
    out[k] = typeof v === 'string' ? decryptCredential(v) : v
  }
  return out
}
