import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { runtimeActor } from "@/lib/runtime-acceptance"

export async function POST(request: Request) {
  const user = await runtimeActor(request)
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const body = await request.json().catch(() => ({})) as { prompt?: string; context?: string }
  const prompt = String(body.prompt || body.context || "").trim()
  if (!prompt) return NextResponse.json({ error: "prompt is required" }, { status: 400 })

  const baseUrl = String(process.env.OPENROUTER_BASE_URL || "").replace(/\/+$/, "")
  const model = String(process.env.OPENROUTER_MODEL || "").trim()
  const apiKey = String(process.env.OPENROUTER_API_KEY || "").trim()
  if (baseUrl !== "https://openrouter.ai/api/v1" || !model || !apiKey) {
    return NextResponse.json({ error: "Exact OpenRouter configuration is required" }, { status: 503 })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 110_000)
  let providerResponse: Response
  try {
    providerResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Title": "No-Code AI Agency" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "Review no-code AI agency workflows for tenant isolation, deployment safety, evidence, provider risk, and accountable human approval." },
          { role: "user", content: prompt },
        ],
        max_tokens: 650,
      }),
    })
  } finally {
    clearTimeout(timer)
  }
  if (!providerResponse.ok) return NextResponse.json({ error: `OpenRouter API error (${providerResponse.status})` }, { status: 502 })
  const provider = await providerResponse.json()
  const content = String(provider.choices?.[0]?.message?.content || "").trim()
  const providerReceipt = {
    requestId: String(provider.id || ""),
    provider: String(provider.provider || "openrouter"),
    upstreamModel: String(provider.model || model),
    created: Number(provider.created || 0),
  }
  if (!content || !providerReceipt.requestId) return NextResponse.json({ error: "OpenRouter response or provider receipt is missing" }, { status: 502 })

  const saved = await prisma.aIUsageLog.create({
    data: {
      agencyId: user.agencyId,
      userId: user.id,
      feature: "agency-governance-review",
      model,
      input: { prompt },
      output: { content },
      ai_results: { providerReceipt },
    },
    select: { id: true },
  })
  return NextResponse.json({ content, model, providerReceipt, interactionId: saved.id })
}
