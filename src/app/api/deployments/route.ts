import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { z } from "zod"

const deploymentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  clientId: z.string().optional(),
  environment: z.enum(["DEVELOPMENT", "STAGING", "PRODUCTION"]).default("STAGING"),
  version: z.string().default("1.0.0"),
  config: z.record(z.string(), z.unknown()).default({}),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !session.user.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const environment = searchParams.get("environment")
    const status = searchParams.get("status")
    const clientId = searchParams.get("clientId")
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "10")

    const where: Record<string, unknown> = {
      agencyId: session.user.agencyId,
    }

    if (environment) where.environment = environment
    if (status) where.status = status
    if (clientId) where.clientId = clientId

    const [deployments, total] = await Promise.all([
      prisma.deployment.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.deployment.count({ where }),
    ])

    return NextResponse.json({
      data: deployments,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error("Error fetching deployments:", error)
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
    const validated = deploymentSchema.parse(body)

    // Verify client belongs to agency if provided
    if (validated.clientId) {
      const client = await prisma.client.findUnique({
        where: { id: validated.clientId },
      })
      if (!client || client.agencyId !== session.user.agencyId) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 })
      }
    }

    const deployment = await prisma.deployment.create({
      data: {
        name: validated.name,
        clientId: validated.clientId,
        environment: validated.environment,
        version: validated.version,
        config: validated.config as object,
        agencyId: session.user.agencyId,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(deployment, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error creating deployment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
