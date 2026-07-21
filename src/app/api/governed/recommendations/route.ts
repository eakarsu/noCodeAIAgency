import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requireActor } from "@/lib/governed-ai/authz"
import { createRecommendationSchema } from "@/lib/governed-ai/contracts"
import { GovernedError, publicError } from "@/lib/governed-ai/errors"
import { assertSameOrigin } from "@/lib/governed-ai/security"
import { createRecommendationJob, listRecommendationJobs } from "@/lib/governed-ai/service"

export async function GET() {
  try {
    const actor = await requireActor(prisma)
    const jobs = await listRecommendationJobs(prisma, actor)
    return NextResponse.json({ jobs }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    const response = publicError(error)
    return NextResponse.json(response.body, { status: response.status, headers: { "Cache-Control": "no-store" } })
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    const actor = await requireActor(prisma)
    const idempotencyKey = request.headers.get("idempotency-key")?.trim()
    if (!idempotencyKey) throw new GovernedError("IDEMPOTENCY_KEY_REQUIRED", "An Idempotency-Key header is required.", 400)
    const input = createRecommendationSchema.parse(await request.json())
    const result = await createRecommendationJob(prisma, actor, input.query, idempotencyKey)
    return NextResponse.json(result, { status: result.replayed ? 200 : 202, headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    const response = publicError(error)
    return NextResponse.json(response.body, { status: response.status, headers: { "Cache-Control": "no-store" } })
  }
}
