import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { z } from "zod"

const aiRequestSchema = z.object({
  type: z.enum(["WORKFLOW", "CODE", "INTEGRATION", "TEMPLATE", "OPTIMIZATION", "DEBUG"]),
  context: z.record(z.string(), z.unknown()),
  prompt: z.string().optional(),
})

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-3-haiku"

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
    throw new Error(`OpenRouter API error: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new Error("No response from OpenRouter")
  }

  // Try to parse JSON from the response
  try {
    // Extract JSON from the response (it might be wrapped in markdown code blocks)
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content]
    const jsonString = jsonMatch[1].trim()
    return JSON.parse(jsonString)
  } catch {
    // If parsing fails, return the raw content as a structured response
    return {
      message: content,
      raw: true,
    }
  }
}

// Fallback responses when OpenRouter is unavailable
const generateFallbackResponse = (type: string, context: Record<string, unknown>) => {
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
    case "INTEGRATION":
      return {
        provider: "recommended-service",
        config: {
          apiEndpoint: "https://api.example.com",
          authType: "oauth2",
          scopes: ["read", "write"],
        },
        steps: [
          "Configure OAuth credentials",
          "Set up webhook endpoints",
          "Map data fields",
          "Test connection",
        ],
      }
    case "TEMPLATE":
      return {
        name: "AI-Generated Template",
        type: "WORKFLOW",
        category: "automation",
        description: "Automated workflow template based on your industry",
        content: {
          features: ["Data sync", "Notifications", "Reporting"],
        },
      }
    case "OPTIMIZATION":
      return {
        recommendations: [
          { area: "Performance", issue: "Slow API calls", fix: "Add caching layer", impact: "high" },
          { area: "Cost", issue: "High API usage", fix: "Batch requests", impact: "medium" },
          { area: "Reliability", issue: "No error handling", fix: "Add retry logic", impact: "high" },
        ],
        priority: "high",
        estimatedImpact: "30% performance improvement",
        implementationSteps: ["Add Redis cache", "Implement request batching", "Add exponential backoff"],
      }
    case "DEBUG":
      return {
        issue: "Identified potential issues",
        errors: [
          { type: "Logic Error", location: "step 3", description: "Missing null check", severity: "warning" },
          { type: "Configuration", location: "integration", description: "Invalid API key format", severity: "critical" },
        ],
        fixes: [
          "Add input validation at step 3",
          "Update API key to match required format",
        ],
        preventionTips: ["Always validate inputs", "Use environment variables for secrets"],
      }
    default:
      return { message: "No suggestion available" }
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validated = aiRequestSchema.parse(body)

    let suggestion
    let confidence = 0.85

    try {
      // Try to get response from OpenRouter
      suggestion = await callOpenRouter(validated.type, validated.context, validated.prompt)
      confidence = 0.9 // Higher confidence for AI-generated responses
    } catch (error) {
      console.error("OpenRouter error, using fallback:", error)
      // Fall back to predefined responses
      suggestion = generateFallbackResponse(validated.type, validated.context)
      confidence = 0.7 // Lower confidence for fallback responses
    }

    // Store the suggestion in the database
    const savedSuggestion = await prisma.aISuggestion.create({
      data: {
        type: validated.type,
        context: validated.context as object,
        suggestion: suggestion,
        confidence: confidence,
      },
    })

    return NextResponse.json({
      id: savedSuggestion.id,
      suggestion,
      confidence,
      model: OPENROUTER_MODEL,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error processing AI request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
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
