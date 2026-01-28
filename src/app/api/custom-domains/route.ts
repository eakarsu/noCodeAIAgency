import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { z } from "zod"

const domainSchema = z.object({
  domain: z.string().min(1).regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/),
})

// GET - Fetch custom domains
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { agency: true },
    })

    if (!user?.agency) {
      return NextResponse.json({ error: "No agency found" }, { status: 404 })
    }

    const domains = await prisma.customDomain.findMany({
      where: { agencyId: user.agency.id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      data: domains,
      total: domains.length,
    })
  } catch (error) {
    console.error("Error fetching custom domains:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Add a new custom domain
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validated = domainSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { agency: true },
    })

    if (!user?.agency) {
      return NextResponse.json({ error: "No agency found" }, { status: 404 })
    }

    // Check if domain already exists
    const existing = await prisma.customDomain.findUnique({
      where: { domain: validated.domain },
    })

    if (existing) {
      return NextResponse.json({ error: "Domain already registered" }, { status: 400 })
    }

    const domain = await prisma.customDomain.create({
      data: {
        agencyId: user.agency.id,
        domain: validated.domain,
        verified: false,
        sslEnabled: false,
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "created",
        entityType: "CustomDomain",
        entityId: domain.id,
        metadata: { name: domain.domain },
      },
    })

    return NextResponse.json(domain, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error creating custom domain:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Remove a custom domain
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const domainId = searchParams.get("id")

    if (!domainId) {
      return NextResponse.json({ error: "Domain ID required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { agency: true },
    })

    if (!user?.agency) {
      return NextResponse.json({ error: "No agency found" }, { status: 404 })
    }

    const domain = await prisma.customDomain.findFirst({
      where: {
        id: domainId,
        agencyId: user.agency.id,
      },
    })

    if (!domain) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 })
    }

    await prisma.customDomain.delete({
      where: { id: domainId },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "deleted",
        entityType: "CustomDomain",
        entityId: domainId,
        metadata: { name: domain.domain },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting custom domain:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
