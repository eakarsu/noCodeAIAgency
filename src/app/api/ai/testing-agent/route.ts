import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { aiRateLimiter, parseAIJson } from '@/lib/ai-helpers'

// Automated Testing Agent — generate test cases, simulate runs, report regressions.
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY
const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id?: string }).id || session.user.email || 'anon'
  const limit = aiRateLimiter(userId)
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded', resetAt: limit.resetAt.toISOString() }, { status: 429 })
  }
  if (!OPENROUTER_KEY) return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 503 })

  const body = (await req.json().catch(() => ({}))) as {
    workflowSpec?: unknown
    workflowId?: string
    priorRuns?: Array<{ input: unknown; output: unknown; passed: boolean }>
  }
  if (!body.workflowSpec && !body.workflowId) {
    return NextResponse.json({ error: 'workflowSpec or workflowId required' }, { status: 400 })
  }

  const sys = 'You are an automated QA agent for no-code AI workflows. Generate edge-case test inputs, expected outputs, and a regression check vs. prior runs. Return JSON: { "tests": [{ "name", "input", "expected", "rationale" }], "regressions": [...], "coverageNotes": "..." }'
  const user = `Workflow: ${JSON.stringify(body.workflowSpec || body.workflowId).slice(0, 6000)}\nPrior runs: ${JSON.stringify(body.priorRuns || []).slice(0, 3000)}\nReturn JSON only.`

  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENROUTER_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], max_tokens: 1500 }),
  })
  const data = await r.json()
  const raw = data?.choices?.[0]?.message?.content || ''
  return NextResponse.json({ parsed: parseAIJson(raw), raw })
}
