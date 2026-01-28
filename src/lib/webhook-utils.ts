import crypto from 'crypto'
import { prisma } from '@/lib/db'

export function generateWebhookSecret(): string {
  return 'whsec_' + crypto.randomBytes(32).toString('hex')
}

export function validateSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch {
    return false
  }
}

export function computeSignature(body: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')
}

export async function checkRateLimit(
  triggerId: string,
  rateLimitPerMinute: number
): Promise<{ allowed: boolean; remaining: number }> {
  const oneMinuteAgo = new Date(Date.now() - 60000)

  const recentCount = await prisma.webhookTriggerLog.count({
    where: {
      triggerId,
      createdAt: { gte: oneMinuteAgo },
    },
  })

  const remaining = Math.max(0, rateLimitPerMinute - recentCount)

  return {
    allowed: recentCount < rateLimitPerMinute,
    remaining,
  }
}
