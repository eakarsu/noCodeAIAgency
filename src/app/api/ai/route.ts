import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { z } from "zod"
import { aiRateLimiter, parseAIJson } from "@/lib/ai-helpers"

const aiRequestSchema = z.object({
  type: z.enum(["WORKFLOW", "CODE", "INTEGRATION", "TEMPLATE", "OPTIMIZATION", "DEBUG", "AUTOCOMPLETE"]),
  context: z.record(z.string(), z.unknown()),
  prompt: z.string().optional(),
})

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-3-5-sonnet-20241022"

// System prompts for different AI request types
const systemPrompts: Record<string, string> = {
  WORKFLOW: `You are an AI workflow assistant. Analyze the user's requirements and suggest an optimal workflow.
Return a JSON object with:
- name: string (workflow name)
- nodes: array of {id: string, type: "trigger"|"action"|"condition"|"delay", data: {label: string, type: string, config?: object}}
- edges: array of {id: string, source: string, target: string}
- description: string (brief explanation)
Keep the workflow practical and between 3-7 nodes.`,

  CODE: `You are an AI code generator. Generate clean, well-documented code based on the requirements.
Return a JSON object with:
- code: string (the generated code)
- language: string (e.g., "javascript", "typescript", "python")
- explanation: string (brief explanation of the code)
Generate production-ready code with proper error handling.`,

  INTEGRATION: `You are an AI integration assistant. Suggest the best integration approach.
Return a JSON object with:
- provider: string (service name)
- config: object with {apiEndpoint: string, authType: string, scopes: string[]}
- steps: string[] (setup steps)
- dataMapping: object (field mappings if applicable)
Provide practical, actionable integration guidance.`,

  TEMPLATE: `You are an AI template creator. Generate a template based on the requirements.
Return a JSON object with:
- name: string
- type: "WORKFLOW"|"FORM"|"DASHBOARD"|"INTEGRATION"|"INDUSTRY"
- category: string
- description: string
- content: object (template-specific content)
- features: string[] (key features)
Create comprehensive, reusable templates.`,

  OPTIMIZATION: `You are an AI optimization assistant. Analyze the provided system/workflow and suggest improvements.
Return a JSON object with:
- recommendations: array of {area: string, issue: string, fix: string, impact: "high"|"medium"|"low"}
- priority: "high"|"medium"|"low"
- estimatedImpact: string (e.g., "30% performance improvement")
- implementationSteps: string[]
Provide actionable, measurable optimization suggestions.`,

  DEBUG: `You are an AI debugging assistant. Analyze the provided code/workflow for issues.
Return a JSON object with:
- issue: string (summary)
- errors: array of {type: string, location: string, description: string, severity: "critical"|"warning"|"info"}
- fixes: string[] (recommended fixes)
- preventionTips: string[] (how to avoid similar issues)
Be thorough and provide specific, actionable fixes.`,

  AUTOCOMPLETE: `You are an AI canvas copilot. Given the user's existing workflow graph and the node they just added, propose the next 1-3 most likely nodes.
Return JSON: { "suggestions": [{ "type": "action|condition|delay|ai|loop|wait", "label": "...", "rationale": "1 sentence why" }] }
Look at existing types and edges; suggest things that complete a typical pipeline (validate → branch → notify).`,
}

async function callOpenRouter(type: string, context: Record<string, unknown>, prompt?: string) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key not configured")
  }

  const systemPrompt = systemPrompts[type] || systemPrompts.WORKFLOW
  const userPrompt = prompt || `Context: ${JSON.stringify(context, null, 2)}\n\nPlease analyze this and provide your recommendation.`

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
      "X-Title": "No-Code AI Agency Builder",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error("OpenRouter API error:", error)
    throw new Error(`OpenRouter API error ${response.status}: ${error.slice(0, 300)}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new Error("No response from OpenRouter")
  }

  // Use 3-strategy resilient parser
  const parsed = parseAIJson(content)
  if (parsed) return parsed
  return { message: content, raw: true }
}

// Fallback responses when OpenRouter is unavailable (dev only).
// In production we surface the real error so failures aren't silently masked.
const generateFallbackResponse = (type: string) => {
  switch (type) {
    case "WORKFLOW":
      return {
        name: "Recommended Workflow",
        nodes: [
          { id: "1", type: "trigger", data: { label: "Start", type: "trigger" } },
          { id: "2", type: "action", data: { label: "Process Data", type: "action" } },
          { id: "3", type: "condition", data: { label: "Check Status", type: "condition" } },
          { id: "4", type: "action", data: { label: "Send Notification", type: "action" } },
        ],
        edges: [
          { id: "e1-2", source: "1", target: "2" },
          { id: "e2-3", source: "2", target: "3" },
          { id: "e3-4", source: "3", target: "4" },
        ],
        description: "Based on your requirements, this workflow handles data processing with conditional logic.",
      }
    case "CODE":
      return {
        code: `// Generated code based on your requirements
async function processData(input) {
  const result = await fetchData(input);
  if (result.success) {
    return transformData(result.data);
  }
  throw new Error('Processing failed');
}

async function fetchData(params) {
  return { success: true, data: params };
}

function transformData(data) {
  return { ...data, processed: true };
}`,
        language: "javascript",
        explanation: "This code implements a basic data processing pipeline with error handling.",
      }
    case "AUTOCOMPLETE":
      return {
        suggestions: [
          { type: "action", label: "Send notification", rationale: "Tell users what just happened" },
          { type: "condition", label: "Check result", rationale: "Branch on the previous step's outcome" },
        ],
      }
    default:
      return { message: "Fallback unavailable; configure OPENROUTER_API_KEY for live AI." }
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as { id?: string }).id || session.user.email || "anonymous"
    const limit = aiRateLimiter(userId)
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: `AI rate limit exceeded. Resets at ${limit.resetAt.toISOString()}.`,
          limit: limit.limit,
          remaining: 0,
          resetAt: limit.resetAt.toISOString(),
        },
        { status: 429 },
      )
    }

    const body = await request.json()
    const validated = aiRequestSchema.parse(body)

    let suggestion
    let confidence = 0.85

    try {
      suggestion = await callOpenRouter(validated.type, validated.context, validated.prompt)
      confidence = 0.9
    } catch (error) {
      if (process.env.NODE_ENV === "production") {
        // Surface the real error in production so failures aren't masked.
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "AI request failed" },
          { status: 502 },
        )
      }
      console.error("OpenRouter error, using fallback (dev mode):", error)
      suggestion = generateFallbackResponse(validated.type)
      confidence = 0.7
    }

    const savedSuggestion = await prisma.aISuggestion.create({
      data: {
        type: validated.type === "AUTOCOMPLETE" ? "OPTIMIZATION" : validated.type,
        context: validated.context as object,
        suggestion: suggestion as object,
        confidence,
      },
    })

    return NextResponse.json({
      id: savedSuggestion.id,
      suggestion,
      confidence,
      model: OPENROUTER_MODEL,
      _meta: {
        rateLimit: { limit: limit.limit, remaining: limit.remaining, resetAt: limit.resetAt.toISOString() },
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error processing AI request:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get("type")
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "10")

    const where: Record<string, unknown> = {}
    if (type) where.type = type

    const [suggestions, total] = await Promise.all([
      prisma.aISuggestion.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.aISuggestion.count({ where }),
    ])

    return NextResponse.json({
      data: suggestions,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error("Error fetching AI suggestions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
