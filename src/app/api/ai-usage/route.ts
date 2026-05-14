import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"

/**
 * Aggregate AI usage analytics for the current agency.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get("days") || "30", 10)
  const page = parseInt(searchParams.get("page") || "1", 10)
  const pageSize = parseInt(searchParams.get("pageSize") || "50", 10)
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  try {
    const where = { agencyId: session.user.agencyId, createdAt: { gte: since } }
    const [data, total, byFeature, totals] = await Promise.all([
      prisma.aIUsageLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.aIUsageLog.count({ where }),
      prisma.aIUsageLog.groupBy({
        by: ["feature"],
        where,
        _count: { _all: true },
        _sum: { costUsd: true, tokensIn: true, tokensOut: true },
      }),
      prisma.aIUsageLog.aggregate({
        where,
        _sum: { costUsd: true, tokensIn: true, tokensOut: true },
      }),
    ])

    return NextResponse.json({
      data,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      byFeature,
      totals: totals._sum,
      windowDays: days,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 },
    )
  }
}
