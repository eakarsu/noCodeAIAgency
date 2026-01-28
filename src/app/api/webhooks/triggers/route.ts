import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { generateWebhookSecret } from "@/lib/webhook-utils"
import { z } from "zod"

const createTriggerSchema = z.object({
  workflowId: z.string().min(1),
  name: z.string().min(1),
  rateLimitPerMinute: z.number().min(1).max(1000).default(60),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !session.user.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get("workflowId")

    const where: Record<string, unknown> = { agencyId: session.user.agencyId }
    if (workflowId) {
      where.workflowId = workflowId
    }

    const triggers = await prisma.webhookTrigger.findMany({
      where,
      include: {
        workflow: { select: { id: true, name: true } },
        _count: { select: { logs: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ triggers })
  } catch (error) {
    console.error("Fetch triggers error:", error)
    return NextResponse.json(
      { error: "Failed to fetch triggers" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !session.user.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createTriggerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      )
    }

    // Verify workflow belongs to agency
    const workflow = await prisma.workflow.findUnique({
      where: { id: parsed.data.workflowId, agencyId: session.user.agencyId },
    })

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    const secret = generateWebhookSecret()

    const trigger = await prisma.webhookTrigger.create({
      data: {
        workflowId: workflow.id,
        agencyId: session.user.agencyId,
        name: parsed.data.name,
        secret,
        rateLimitPerMinute: parsed.data.rateLimitPerMinute,
      },
    })

    return NextResponse.json({
      trigger: {
        id: trigger.id,
        name: trigger.name,
        secret: trigger.secret,
        url: `/api/webhooks/trigger/${trigger.id}`,
        rateLimitPerMinute: trigger.rateLimitPerMinute,
        isActive: trigger.isActive,
      },
    }, { status: 201 })
  } catch (error) {
    console.error("Create trigger error:", error)
    return NextResponse.json(
      { error: "Failed to create trigger" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !session.user.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { id, name, isActive, rateLimitPerMinute } = body

    if (!id) {
      return NextResponse.json({ error: "Trigger ID required" }, { status: 400 })
    }

    const trigger = await prisma.webhookTrigger.findUnique({
      where: { id, agencyId: session.user.agencyId },
    })

    if (!trigger) {
      return NextResponse.json({ error: "Trigger not found" }, { status: 404 })
    }

    const updated = await prisma.webhookTrigger.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(isActive !== undefined && { isActive }),
        ...(rateLimitPerMinute !== undefined && { rateLimitPerMinute }),
      },
    })

    return NextResponse.json({ trigger: updated })
  } catch (error) {
    console.error("Update trigger error:", error)
    return NextResponse.json(
      { error: "Failed to update trigger" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !session.user.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Trigger ID required" }, { status: 400 })
    }

    const trigger = await prisma.webhookTrigger.findUnique({
      where: { id, agencyId: session.user.agencyId },
    })

    if (!trigger) {
      return NextResponse.json({ error: "Trigger not found" }, { status: 404 })
    }

    // Delete logs first, then trigger
    await prisma.webhookTriggerLog.deleteMany({ where: { triggerId: id } })
    await prisma.webhookTrigger.delete({ where: { id } })

    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error("Delete trigger error:", error)
    return NextResponse.json(
      { error: "Failed to delete trigger" },
      { status: 500 }
    )
  }
}
