import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requireActor } from "@/lib/governed-ai/authz"
import { decisionSchema } from "@/lib/governed-ai/contracts"
import { publicError } from "@/lib/governed-ai/errors"
import { assertSameOrigin } from "@/lib/governed-ai/security"
import { decideRecommendation } from "@/lib/governed-ai/service"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request)
    const actor = await requireActor(prisma)
    const { id } = await context.params
    const input = decisionSchema.parse(await request.json())
    const job = await decideRecommendation(prisma, actor, id, input.decision, input.note)
    return NextResponse.json({ job }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    const response = publicError(error)
    return NextResponse.json(response.body, { status: response.status, headers: { "Cache-Control": "no-store" } })
  }
}
