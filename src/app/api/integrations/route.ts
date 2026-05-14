import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { z } from "zod"
import { encryptCredentialsObject } from "@/lib/ai-helpers"

const integrationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["SAAS", "AI_MODEL", "HOSTING", "PAYMENT", "SUPPORT", "CUSTOM"]),
  provider: z.string().min(1, "Provider is required"),
  config: z.record(z.string(), z.unknown()).default({}),
  credentials: z.record(z.string(), z.unknown()).default({}),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !session.user.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get("type")
    const status = searchParams.get("status")
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "10")

    const where: Record<string, unknown> = {
      agencyId: session.user.agencyId,
    }

    if (type) where.type = type
    if (status) where.status = status

    const [integrations, total] = await Promise.all([
      prisma.integration.findMany({
        where,
        include: {
          dataMappings: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.integration.count({ where }),
    ])

    return NextResponse.json({
      data: integrations,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error("Error fetching integrations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !session.user.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validated = integrationSchema.parse(body)

    // Encrypt credentials at rest with AES-256-GCM (envelope encryption).
    // CREDENTIALS_KEY env var must be a base64-encoded 32-byte key.
    const integration = await prisma.integration.create({
      data: {
        name: validated.name,
        type: validated.type,
        provider: validated.provider,
        config: validated.config as object,
        credentials: encryptCredentialsObject(validated.credentials as Record<string, unknown>) as object,
        agencyId: session.user.agencyId,
      },
    })

    return NextResponse.json(integration, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error creating integration:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
