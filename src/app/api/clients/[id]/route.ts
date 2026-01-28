import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { z } from "zod"

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  plan: z.string().optional(),
  monthlyRate: z.number().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !session.user.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        workspace: true,
        billing: {
          include: {
            invoices: {
              orderBy: { createdAt: "desc" },
              take: 10,
            },
          },
        },
        usageRecords: {
          orderBy: { date: "desc" },
          take: 30,
        },
        supportTickets: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        deployments: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    if (client.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error("Error fetching client:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !session.user.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const client = await prisma.client.findUnique({
      where: { id },
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    if (client.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validated = updateClientSchema.parse(body)

    const { plan, monthlyRate, ...clientData } = validated

    const updated = await prisma.client.update({
      where: { id },
      data: clientData,
      include: {
        workspace: true,
        billing: true,
      },
    })

    // Update billing if plan or rate changed
    if (plan || monthlyRate !== undefined) {
      await prisma.clientBilling.upsert({
        where: { clientId: id },
        update: {
          ...(plan && { plan }),
          ...(monthlyRate !== undefined && { monthlyRate }),
        },
        create: {
          clientId: id,
          plan: plan || "starter",
          monthlyRate: monthlyRate || 0,
          billingCycle: "monthly",
        },
      })
    }

    const result = await prisma.client.findUnique({
      where: { id },
      include: { workspace: true, billing: true },
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error updating client:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !session.user.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const client = await prisma.client.findUnique({
      where: { id },
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    if (client.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Delete related records
    await prisma.$transaction([
      prisma.usageRecord.deleteMany({ where: { clientId: id } }),
      prisma.supportTicket.deleteMany({ where: { clientId: id } }),
      prisma.deployment.deleteMany({ where: { clientId: id } }),
      prisma.clientWorkspace.deleteMany({ where: { clientId: id } }),
      prisma.clientBilling.deleteMany({ where: { clientId: id } }),
      prisma.client.delete({ where: { id } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting client:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
