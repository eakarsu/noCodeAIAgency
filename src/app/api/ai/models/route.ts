import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { AIService } from "@/lib/ai/service"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !session.user.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const aiService = new AIService()
    const allModels = aiService.getAvailableModels()
    const configuredProviders = await aiService.getConfiguredProviders(session.user.agencyId)

    const models = allModels.map(model => ({
      ...model,
      configured: configuredProviders.includes(model.provider),
    }))

    return NextResponse.json({
      models,
      configuredProviders,
    })
  } catch (error) {
    console.error("AI models fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch AI models" },
      { status: 500 }
    )
  }
}
