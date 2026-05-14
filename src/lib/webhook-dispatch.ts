/**
 * Outbound webhook dispatch with retry queue.
 *
 * Call `dispatchWebhook` to send an outbound webhook. If the target returns
 * a non-2xx status the attempt is stored in WebhookRetry for later processing
 * by POST /api/cron/retry-webhooks.
 */
import prisma from '@/lib/db'
import { computeSignature } from '@/lib/webhook-utils'

// Exponential backoff delays in milliseconds
const RETRY_DELAYS_MS = [
  1 * 60 * 1000,    // 1 minute
  5 * 60 * 1000,    // 5 minutes
  30 * 60 * 1000,   // 30 minutes
  2 * 60 * 60 * 1000, // 2 hours
  6 * 60 * 60 * 1000, // 6 hours
]

const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1  // initial + retries

export interface DispatchResult {
  success: boolean
  statusCode?: number
  error?: string
}

/**
 * Dispatch a webhook to a target URL. On failure, enqueue a retry record.
 */
export async function dispatchWebhook(
  webhookId: string,
  targetUrl: string,
  secret: string,
  event: string,
  payload: Record<string, unknown>
): Promise<DispatchResult> {
  const body = JSON.stringify(payload)
  const signature = computeSignature(body, secret)

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Event': event,
        'X-Webhook-Signature': signature,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    })

    // Log success
    await logWebhookAttempt(webhookId, event, payload, response.status, response.ok)

    if (response.ok) {
      return { success: true, statusCode: response.status }
    }

    // Non-2xx — schedule a retry
    const errorText = await response.text().catch(() => '')
    await scheduleRetry(webhookId, targetUrl, event, payload, `HTTP ${response.status}: ${errorText.slice(0, 200)}`)

    return { success: false, statusCode: response.status, error: `HTTP ${response.status}` }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    await logWebhookAttempt(webhookId, event, payload, 0, false)
    await scheduleRetry(webhookId, targetUrl, event, payload, errorMsg)
    return { success: false, error: errorMsg }
  }
}

async function scheduleRetry(
  webhookId: string,
  targetUrl: string,
  event: string,
  payload: Record<string, unknown>,
  lastError: string
) {
  const nextRetryAt = new Date(Date.now() + RETRY_DELAYS_MS[0])
  try {
    await prisma.webhookRetry.create({
      data: {
        webhookId,
        event,
        payload: payload as never,
        targetUrl,
        attemptCount: 1,
        maxAttempts: MAX_ATTEMPTS,
        nextRetryAt,
        lastError,
        status: 'pending',
      },
    })
  } catch (err) {
    console.error('[WebhookDispatch] Failed to schedule retry:', err)
  }
}

async function logWebhookAttempt(
  webhookId: string,
  event: string,
  payload: Record<string, unknown>,
  statusCode: number,
  success: boolean
) {
  try {
    await prisma.webhookLog.create({
      data: {
        webhookId,
        event,
        payload: payload as never,
        statusCode,
        success,
      },
    })
  } catch {
    // Non-critical
  }
}

/**
 * Process pending retry records. Called by the cron endpoint.
 * Returns number of records processed.
 */
export async function processWebhookRetries(): Promise<{ processed: number; succeeded: number; failed: number; exhausted: number }> {
  const now = new Date()

  const pendingRetries = await prisma.webhookRetry.findMany({
    where: {
      status: 'pending',
      nextRetryAt: { lte: now },
    },
    take: 50,  // Process up to 50 per run
    orderBy: { nextRetryAt: 'asc' },
  })

  let succeeded = 0
  let failed = 0
  let exhausted = 0

  for (const retry of pendingRetries) {
    // Fetch the webhook to get the current secret
    const webhook = await prisma.webhook.findUnique({
      where: { id: retry.webhookId },
    })

    if (!webhook || !webhook.isActive) {
      await prisma.webhookRetry.update({
        where: { id: retry.id },
        data: { status: 'exhausted', lastError: 'Webhook not found or inactive' },
      })
      exhausted++
      continue
    }

    const body = JSON.stringify(retry.payload)
    const signature = computeSignature(body, webhook.secret)

    try {
      const response = await fetch(retry.targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': retry.event,
          'X-Webhook-Signature': signature,
          'X-Webhook-Attempt': String(retry.attemptCount + 1),
        },
        body,
        signal: AbortSignal.timeout(10_000),
      })

      if (response.ok) {
        await prisma.webhookRetry.update({
          where: { id: retry.id },
          data: { status: 'succeeded', attemptCount: retry.attemptCount + 1 },
        })
        succeeded++
      } else {
        await handleRetryFailure(retry, `HTTP ${response.status}`)
        failed++
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      await handleRetryFailure(retry, errorMsg)
      failed++
    }
  }

  return { processed: pendingRetries.length, succeeded, failed, exhausted }
}

async function handleRetryFailure(
  retry: { id: string; attemptCount: number; maxAttempts: number },
  lastError: string
) {
  const nextAttemptNumber = retry.attemptCount + 1

  if (nextAttemptNumber >= retry.maxAttempts) {
    // Exhausted all retries
    await prisma.webhookRetry.update({
      where: { id: retry.id },
      data: {
        status: 'exhausted',
        attemptCount: nextAttemptNumber,
        lastError,
      },
    })
    return
  }

  // Schedule next retry with exponential backoff
  const delayIndex = Math.min(nextAttemptNumber - 1, RETRY_DELAYS_MS.length - 1)
  const nextRetryAt = new Date(Date.now() + RETRY_DELAYS_MS[delayIndex])

  await prisma.webhookRetry.update({
    where: { id: retry.id },
    data: {
      attemptCount: nextAttemptNumber,
      nextRetryAt,
      lastError,
    },
  })
}
