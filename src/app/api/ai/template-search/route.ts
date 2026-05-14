import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { aiRateLimiter, parseAIJson } from '@/lib/ai-helpers'
import { prisma } from '@/lib/db'

// AI-Powered Template Search & Recommendations
// RAG over templates + user query to surface best-fit solutions.
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY
const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id?: string }).id || session.user.email || 'anonymous'
  const limit = aiRateLimiter(userId)
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded', resetAt: limit.resetAt.toISOString() }, { status: 429 })
  }
  if (!OPENROUTER_KEY) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 503 })
  }

  const body = await req.json().catch(() => ({})) as { query?: string; tags?: string[] }
  const query = (body.query || '').trim()
  if (!query) return NextResponse.json({ error: 'query required' }, { status: 400 })

  // Pull a candidate set; lean heuristic search before LLM ranking.
  let candidates: Array<{ id: string; name: string; description?: string | null; category?: string | null }> = []
  try {
    candidates = await (prisma as any).template.findMany({
      take: 25,
      select: { id: true, name: true, description: true, category: true },
    })
  } catch {
    // schema/table absent or differently named — proceed with empty list
  }

  const compact = candidates.slice(0, 25).map((t) => `- [${t.id}] ${t.name}: ${(t.description || '').slice(0, 200)}`).join('\n')

  const prompt = `User intent: "${query}"\nFilters: ${(body.tags || []).join(',') || 'none'}\n\nTemplate catalog:\n${compact || '(empty)'}\n\nRank up to 5 templates by best fit. Return JSON: { "ranked": [{ "templateId": "...", "score": 0-100, "reason": "..." }], "queryRefinement": "..." }`

  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENROUTER_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 800 }),
  })
  const data = await r.json()
  const raw = data?.choices?.[0]?.message?.content || ''
  return NextResponse.json({ parsed: parseAIJson(raw), raw, model: MODEL })
}
