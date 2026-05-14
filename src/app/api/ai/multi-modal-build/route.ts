import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { aiRateLimiter, parseAIJson } from '@/lib/ai-helpers'

// Multi-modal Agent Builder — drafts a drag-and-drop graph: LLM prompt + vision + voice + scraping nodes.
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY
const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022'

interface NodeSpec {
  id: string
  type: 'llm' | 'vision' | 'voice' | 'scraper' | 'input' | 'output' | 'branch'
  data?: Record<string, unknown>
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id?: string }).id || session.user.email || 'anon'
  const rl = aiRateLimiter(userId)
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limit exceeded', resetAt: rl.resetAt.toISOString() }, { status: 429 })

  const body = (await req.json().catch(() => ({}))) as {
    intent?: string
    constraints?: string
    preferredNodes?: NodeSpec['type'][]
  }
  if (!body.intent) return NextResponse.json({ error: 'intent required' }, { status: 400 })

  // Heuristic fallback if no LLM key — still emit a usable starter graph.
  if (!OPENROUTER_KEY) {
    const nodes: NodeSpec[] = [
      { id: 'in', type: 'input' },
      { id: 'vision', type: 'vision', data: { task: 'describe_image' } },
      { id: 'llm', type: 'llm', data: { promptHint: body.intent } },
      { id: 'voice', type: 'voice', data: { mode: 'tts' } },
      { id: 'out', type: 'output' },
    ]
    const edges = [
      { source: 'in', target: 'vision' },
      { source: 'vision', target: 'llm' },
      { source: 'llm', target: 'voice' },
      { source: 'voice', target: 'out' },
    ]
    return NextResponse.json({ graph: { nodes, edges }, source: 'heuristic' })
  }

  const sys = 'You are an agent-builder copilot. Given an intent, produce a directed graph of nodes (types: llm, vision, voice, scraper, input, output, branch) wired to satisfy the intent. Output JSON: { "nodes": [{ "id", "type", "data" }], "edges": [{ "source", "target" }] }.'
  const user = `Intent: ${body.intent}\nConstraints: ${body.constraints || 'none'}\nPreferred node types: ${(body.preferredNodes || []).join(',') || 'any'}\nReturn JSON only.`

  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENROUTER_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], max_tokens: 1500 }),
  })
  const data = await r.json()
  const raw = data?.choices?.[0]?.message?.content || ''
  return NextResponse.json({ graph: parseAIJson(raw), raw, source: 'llm' })
}
