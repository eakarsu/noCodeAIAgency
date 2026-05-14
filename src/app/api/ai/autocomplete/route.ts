import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { aiRateLimiter, parseAIJson } from "@/lib/ai-helpers"

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-3-5-sonnet-20241022"

interface AutocompleteBody {
  graph: { nodes: Array<{ id: string; type: string; data?: { label?: string; type?: string } }>; edges: Array<{ source: string; target: string }> }
  cursorNodeId?: string
}

interface Suggestion {
  type: string
  label: string
  rationale: string
}

/**
 * AI Copilot for the canvas:
 * Given a graph and optional cursor node, return up to 3 suggested next nodes.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as { id?: string }).id || session.user.email || "anonymous"
  const limit = aiRateLimiter(userId)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", resetAt: limit.resetAt.toISOString() },
      { status: 429 },
    )
  }

  if (!OPENROUTER_API_KEY) {
    // Heuristic fallback when AI key missing
    return NextResponse.json({ suggestions: heuristicSuggestions(), source: "heuristic" })
  }

  const body = (await req.json()) as AutocompleteBody
  if (!body?.graph) return NextResponse.json({ error: "graph required" }, { status: 400 })

  const cursorNode = body.cursorNodeId
    ? body.graph.nodes.find((n) => n.id === body.cursorNodeId)
    : body.graph.nodes[body.graph.nodes.length - 1]

  const summary = {
    nodes: body.graph.nodes.map((n) => ({ id: n.id, type: n.type, label: n.data?.label })),
    edges: body.graph.edges.map((e) => `${e.source}→${e.target}`),
    cursorNode: cursorNode ? { id: cursorNode.id, type: cursorNode.type, label: cursorNode.data?.label } : null,
  }

  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
        "X-Title": "Canvas Copilot",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        max_tokens: 500,
        temperature: 0.6,
        messages: [
          {
            role: "system",
            content:
              'You are a no-code workflow copilot. Suggest the next 1-3 nodes to add. Return JSON: { "suggestions": [{ "type": "action|condition|delay|ai|loop|wait|email|api", "label": "Short verb phrase", "rationale": "1 sentence" }] }',
          },
          { role: "user", content: `Current graph: ${JSON.stringify(summary)}` },
        ],
      }),
    })
    if (!r.ok) {
      const errBody = await r.text()
      throw new Error(`OpenRouter ${r.status}: ${errBody.slice(0, 200)}`)
    }
    const data = await r.json()
    const content = data.choices?.[0]?.message?.content || ""
    const parsed = parseAIJson<{ suggestions: Suggestion[] }>(content)
    return NextResponse.json({
      suggestions: parsed?.suggestions || heuristicSuggestions(),
      source: parsed ? "ai" : "fallback",
      _meta: { rateLimit: { limit: limit.limit, remaining: limit.remaining } },
    })
  } catch (err) {
    return NextResponse.json(
      { suggestions: heuristicSuggestions(), source: "error", error: err instanceof Error ? err.message : "failed" },
    )
  }
}

function heuristicSuggestions(): Suggestion[] {
  return [
    { type: "condition", label: "Check the result", rationale: "Branch on the previous node's output" },
    { type: "action", label: "Send a notification", rationale: "Inform the team of the outcome" },
    { type: "ai", label: "Summarize with AI", rationale: "Compress the data for downstream use" },
  ]
}
