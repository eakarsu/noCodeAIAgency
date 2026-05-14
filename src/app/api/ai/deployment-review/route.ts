import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { aiRateLimiter, parseAIJson } from '@/lib/ai-helpers'

// Deployment Safety Net — AI reviews config changes before go-live, flags breaking changes.
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY
const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id?: string }).id || session.user.email || 'anon'
  const rl = aiRateLimiter(userId)
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limit exceeded', resetAt: rl.resetAt.toISOString() }, { status: 429 })

  if (!OPENROUTER_KEY) return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 503 })

  const body = (await req.json().catch(() => ({}))) as {
    currentConfig?: unknown
    proposedConfig?: unknown
    deploymentId?: string
  }
  if (!body.currentConfig || !body.proposedConfig) {
    return NextResponse.json({ error: 'currentConfig and proposedConfig required' }, { status: 400 })
  }

  const sys = 'You are a senior platform-engineer reviewer. Compare current vs. proposed config; flag breaking changes (renamed nodes, removed fields, model swaps, prompt regressions, rate-limit changes). Return JSON: { "verdict": "approve|warn|block", "breakingChanges": [...], "warnings": [...], "suggestedRollbackHook": "...", "riskScore": 0-100 }.'
  const user = `CURRENT:\n${JSON.stringify(body.currentConfig).slice(0, 6000)}\n\nPROPOSED:\n${JSON.stringify(body.proposedConfig).slice(0, 6000)}\n\nReturn JSON only.`

  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENROUTER_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], max_tokens: 1200 }),
  })
  const data = await r.json()
  const raw = data?.choices?.[0]?.message?.content || ''
  return NextResponse.json({ parsed: parseAIJson(raw), raw, deploymentId: body.deploymentId || null })
}
