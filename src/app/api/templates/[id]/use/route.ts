import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { z } from "zod"

const useTemplateSchema = z.object({
  name: z.string().min(1).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !session.user.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const parsed = useTemplateSchema.safeParse(body)

    const template = await prisma.template.findUnique({
      where: { id },
    })

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    if (!template.isPublic && template.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Template not accessible" }, { status: 403 })
    }

    const content = template.content as Record<string, unknown>
    const nodes = content.nodes || []
    const edges = content.edges || []
    const variables = content.variables || {}

    const workflowName = parsed.success && parsed.data.name
      ? parsed.data.name
      : `${template.name} (Copy)`

    // Create new workflow from template
    const workflow = await prisma.workflow.create({
      data: {
        agencyId: session.user.agencyId,
        name: workflowName,
        description: template.description || undefined,
        nodes: nodes as object,
        edges: edges as object,
        variables: variables as object,
        status: "DRAFT",
        version: "1.0.0",
      },
    })

    // Create initial version
    await prisma.workflowVersion.create({
      data: {
        workflowId: workflow.id,
        version: "1.0.0",
        nodes: nodes as object,
        edges: edges as object,
        variables: variables as object,
        changelog: `Created from template: ${template.name}`,
      },
    })

    // Increment template downloads
    await prisma.template.update({
      where: { id },
      data: { downloads: { increment: 1 } },
    })

    return NextResponse.json({
      workflow: {
        id: workflow.id,
        name: workflow.name,
        status: workflow.status,
        version: workflow.version,
      },
      templateName: template.name,
    }, { status: 201 })
  } catch (error) {
    console.error("Use template error:", error)
    return NextResponse.json(
      { error: "Failed to create workflow from template" },
      { status: 500 }
    )
  }
}
