import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { z } from "zod"

const ticketSchema = z.object({
  clientId: z.string(),
  subject: z.string().min(1, "Subject is required"),
  description: z.string().min(1, "Description is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !session.user.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")
    const priority = searchParams.get("priority")
    const clientId = searchParams.get("clientId")
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "10")

    // Get client IDs that belong to this agency
    const agencyClients = await prisma.client.findMany({
      where: { agencyId: session.user.agencyId },
      select: { id: true },
    })
    const clientIds = agencyClients.map((c) => c.id)

    const where: Record<string, unknown> = {
      clientId: { in: clientIds },
    }

    if (status) where.status = status
    if (priority) where.priority = priority
    if (clientId && clientIds.includes(clientId)) where.clientId = clientId

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.supportTicket.count({ where }),
    ])

    return NextResponse.json({
      data: tickets,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error("Error fetching support tickets:", error)
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
    const validated = ticketSchema.parse(body)

    // Verify client belongs to agency
    const client = await prisma.client.findUnique({
      where: { id: validated.clientId },
    })
    if (!client || client.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        ...validated,
        userId: session.user.id,
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

    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error creating support ticket:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
