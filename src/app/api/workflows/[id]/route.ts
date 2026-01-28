import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { z } from "zod"

const updateWorkflowSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  nodes: z.array(z.record(z.string(), z.unknown())).optional(),
  edges: z.array(z.record(z.string(), z.unknown())).optional(),
  variables: z.record(z.string(), z.unknown()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
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
    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    })

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    if (workflow.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(workflow)
  } catch (error) {
    console.error("Error fetching workflow:", error)
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
    const workflow = await prisma.workflow.findUnique({
      where: { id },
    })

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    if (workflow.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validated = updateWorkflowSchema.parse(body)

    // Prepare update data with proper type casting
    let newVersion: string | undefined

    // Create a version before updating
    if (validated.nodes || validated.edges) {
      await prisma.workflowVersion.create({
        data: {
          workflowId: id,
          version: workflow.version,
          nodes: workflow.nodes as object,
          edges: workflow.edges as object,
          variables: workflow.variables as object,
          changelog: `Auto-saved version ${workflow.version}`,
        },
      })

      // Increment version
      const versionParts = workflow.version.split(".")
      versionParts[2] = String(parseInt(versionParts[2]) + 1)
      newVersion = versionParts.join(".")
    }

    const updated = await prisma.workflow.update({
      where: { id },
      data: {
        name: validated.name,
        description: validated.description,
        nodes: validated.nodes as object[] | undefined,
        edges: validated.edges as object[] | undefined,
        variables: validated.variables as object | undefined,
        settings: validated.settings as object | undefined,
        status: validated.status,
        version: newVersion,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error updating workflow:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH is an alias for PUT
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PUT(request, context)
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
    const workflow = await prisma.workflow.findUnique({
      where: { id },
    })

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    if (workflow.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Delete versions first
    await prisma.workflowVersion.deleteMany({
      where: { workflowId: id },
    })

    await prisma.workflow.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting workflow:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
