import { NextRequest, NextResponse } from 'next/server'
import { processWebhookRetries } from '@/lib/webhook-dispatch'

/**
 * POST /api/cron/retry-webhooks
 *
 * Processes pending webhook retry records. Call this on a schedule
 * (e.g. every minute via Vercel Cron, GitHub Actions, or an external cron service).
 *
 * Secured with a shared CRON_SECRET header to prevent unauthorized invocations.
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const result = await processWebhookRetries()
    return NextResponse.json({
      ok: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron] retry-webhooks error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
