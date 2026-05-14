import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"

/**
 * GET /api/replays?workflowId=&page=&pageSize=
 * Paginated execution replays for click-to-replay UI.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const workflowId = searchParams.get("workflowId") || undefined
  const page = parseInt(searchParams.get("page") || "1")
  const pageSize = parseInt(searchParams.get("pageSize") || "20")

  const where: Record<string, unknown> = { agencyId: session.user.agencyId }
  if (workflowId) where.workflowId = workflowId

  const [data, total] = await Promise.all([
    prisma.executionReplay.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.executionReplay.count({ where }),
  ])

  return NextResponse.json({ data, page, pageSize, total, totalPages: Math.ceil(total / pageSize) })
}
