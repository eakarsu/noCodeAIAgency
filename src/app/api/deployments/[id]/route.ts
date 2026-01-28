import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { z } from "zod"

const updateDeploymentSchema = z.object({
  name: z.string().min(1).optional(),
  environment: z.enum(["DEVELOPMENT", "STAGING", "PRODUCTION"]).optional(),
  status: z.enum(["PENDING", "DEPLOYING", "DEPLOYED", "FAILED", "ROLLED_BACK"]).optional(),
  version: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  url: z.string().optional(),
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
    const deployment = await prisma.deployment.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
          },
        },
      },
    })

    if (!deployment) {
      return NextResponse.json({ error: "Deployment not found" }, { status: 404 })
    }

    if (deployment.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(deployment)
  } catch (error) {
    console.error("Error fetching deployment:", error)
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
    const deployment = await prisma.deployment.findUnique({
      where: { id },
    })

    if (!deployment) {
      return NextResponse.json({ error: "Deployment not found" }, { status: 404 })
    }

    if (deployment.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validated = updateDeploymentSchema.parse(body)

    // If deploying, set deployedAt
    const updateData: Record<string, unknown> = { ...validated }
    if (validated.status === "DEPLOYED") {
      updateData.deployedAt = new Date()
    }

    const updated = await prisma.deployment.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error updating deployment:", error)
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
    const deployment = await prisma.deployment.findUnique({
      where: { id },
    })

    if (!deployment) {
      return NextResponse.json({ error: "Deployment not found" }, { status: 404 })
    }

    if (deployment.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.deployment.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting deployment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
