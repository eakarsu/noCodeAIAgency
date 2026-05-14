import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { z } from "zod"

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["PROMPT_BLOCK", "SUB_WORKFLOW", "CODE_SNIPPET"]),
  description: z.string().optional(),
  content: z.record(z.string(), z.unknown()),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") || undefined
  const page = parseInt(searchParams.get("page") || "1")
  const pageSize = parseInt(searchParams.get("pageSize") || "20")

  const where: Record<string, unknown> = { agencyId: session.user.agencyId }
  if (type) where.type = type

  const [data, total] = await Promise.all([
    prisma.sharedComponent.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.sharedComponent.count({ where }),
  ])
  return NextResponse.json({ data, page, pageSize, total, totalPages: Math.ceil(total / pageSize) })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const v = createSchema.parse(await req.json())
    const initialVersion = { version: "1.0.0", content: v.content, createdAt: new Date().toISOString() }
    const created = await prisma.sharedComponent.create({
      data: {
        agencyId: session.user.agencyId,
        name: v.name,
        type: v.type,
        description: v.description,
        content: v.content as object,
        versions: [initialVersion] as object,
        currentVersion: "1.0.0",
      },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues }, { status: 400 })
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}
