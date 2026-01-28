import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { z } from "zod"

const activitySchema = z.object({
  action: z.string(),
  entityType: z.string(),
  entityId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

// GET - Fetch recent activity
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get("limit") || "10")
    const entityType = searchParams.get("entityType")

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const where: Record<string, unknown> = {}

    // Filter by user or show all for agency owner
    if (user.role !== "AGENCY_OWNER") {
      where.userId = user.id
    }

    if (entityType) {
      where.entityType = entityType
    }

    const activities = await prisma.activityLog.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    })

    // Format activities for display
    const formattedActivities = activities.map((activity) => ({
      id: activity.id,
      action: activity.action,
      entityType: activity.entityType,
      entityId: activity.entityId,
      metadata: activity.metadata,
      user: activity.user,
      createdAt: activity.createdAt,
      description: formatActivityDescription(activity.action, activity.entityType, activity.metadata as Record<string, unknown>),
    }))

    return NextResponse.json({
      data: formattedActivities,
      total: formattedActivities.length,
    })
  } catch (error) {
    console.error("Error fetching activities:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Log a new activity
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validated = activitySchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const activity = await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: validated.action,
        entityType: validated.entityType,
        entityId: validated.entityId,
        metadata: validated.metadata as object ?? {},
      },
    })

    return NextResponse.json(activity, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error creating activity:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function formatActivityDescription(action: string, entityType: string, metadata: Record<string, unknown>): string {
  const name = metadata?.name || entityType

  switch (action) {
    case "created":
      return `Created ${entityType.toLowerCase()} "${name}"`
    case "updated":
      return `Updated ${entityType.toLowerCase()} "${name}"`
    case "deleted":
      return `Deleted ${entityType.toLowerCase()} "${name}"`
    case "deployed":
      return `Deployed ${entityType.toLowerCase()} "${name}" to ${metadata?.environment || "production"}`
    case "activated":
      return `Activated ${entityType.toLowerCase()} "${name}"`
    case "deactivated":
      return `Deactivated ${entityType.toLowerCase()} "${name}"`
    case "login":
      return "Logged in successfully"
    case "logout":
      return "Logged out"
    default:
      return `${action} ${entityType.toLowerCase()}`
  }
}
