import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { z } from "zod"

const createSchema = z.object({
  name: z.string().min(1),
  workflowAId: z.string().uuid(),
  workflowBId: z.string().uuid(),
  trafficSplit: z.number().int().min(1).max(99).default(50),
  metricsConfig: z.record(z.string(), z.unknown()).default({}),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get("page") || "1")
  const pageSize = parseInt(searchParams.get("pageSize") || "20")

  const where = { agencyId: session.user.agencyId }
  const [data, total] = await Promise.all([
    prisma.workflowABTest.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        results: { take: 100, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.workflowABTest.count({ where }),
  ])

  // Compute aggregates per test
  const enriched = data.map((t) => {
    const resA = t.results.filter((r) => r.variant === "A")
    const resB = t.results.filter((r) => r.variant === "B")
    const stats = (rs: typeof t.results) => {
      const total = rs.length
      const succ = rs.filter((r) => r.succeeded).length
      const avgDur = total ? rs.reduce((s, r) => s + (r.durationMs || 0), 0) / total : 0
      const avgCost = total ? rs.reduce((s, r) => s + (r.costUsd || 0), 0) / total : 0
      return { runs: total, successRate: total ? succ / total : 0, avgDurationMs: avgDur, avgCostUsd: avgCost }
    }
    return { ...t, statsA: stats(resA), statsB: stats(resB) }
  })

  return NextResponse.json({ data: enriched, page, pageSize, total, totalPages: Math.ceil(total / pageSize) })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const v = createSchema.parse(body)
    const test = await prisma.workflowABTest.create({
      data: {
        agencyId: session.user.agencyId,
        name: v.name,
        workflowAId: v.workflowAId,
        workflowBId: v.workflowBId,
        trafficSplit: v.trafficSplit,
        metricsConfig: v.metricsConfig as object,
      },
    })
    return NextResponse.json(test, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues }, { status: 400 })
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}
