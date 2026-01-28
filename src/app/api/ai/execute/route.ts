import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { AIService } from "@/lib/ai/service"
import { z } from "zod"

const executeSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google", "openrouter"]),
  model: z.enum(["gpt-4", "gpt-3.5-turbo", "claude-3-opus", "claude-3-sonnet", "gemini-pro"]),
  action: z.enum(["classify", "extract", "summarize", "sentiment", "generate", "transform"]),
  input: z.string().min(1),
  systemPrompt: z.string().optional(),
  parameters: z.object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().min(1).max(16384).optional(),
    topP: z.number().min(0).max(1).optional(),
  }).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !session.user.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = executeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const aiService = new AIService()
    const response = await aiService.execute(parsed.data, session.user.agencyId)

    if (!response.success) {
      return NextResponse.json(
        { error: response.error, provider: response.provider, model: response.model },
        { status: 422 }
      )
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("AI execution error:", error)
    return NextResponse.json(
      { error: "Failed to execute AI request" },
      { status: 500 }
    )
  }
}
