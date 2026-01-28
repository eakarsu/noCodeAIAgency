import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { computeWorkflowDiff } from "@/lib/workflow-diff"
import { WorkflowNode, WorkflowEdge } from "@/types"

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
    const { searchParams } = new URL(request.url)
    const fromVersionId = searchParams.get("from")
    const toVersionId = searchParams.get("to")

    if (!fromVersionId || !toVersionId) {
      return NextResponse.json(
        { error: "Both 'from' and 'to' version IDs are required" },
        { status: 400 }
      )
    }

    // Verify workflow belongs to agency
    const workflow = await prisma.workflow.findUnique({
      where: { id, agencyId: session.user.agencyId },
      select: { id: true },
    })

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    const [fromVersion, toVersion] = await Promise.all([
      prisma.workflowVersion.findUnique({
        where: { id: fromVersionId, workflowId: id },
      }),
      prisma.workflowVersion.findUnique({
        where: { id: toVersionId, workflowId: id },
      }),
    ])

    if (!fromVersion || !toVersion) {
      return NextResponse.json(
        { error: "One or both versions not found" },
        { status: 404 }
      )
    }

    const diff = computeWorkflowDiff(
      fromVersion.nodes as unknown as WorkflowNode[],
      fromVersion.edges as unknown as WorkflowEdge[],
      toVersion.nodes as unknown as WorkflowNode[],
      toVersion.edges as unknown as WorkflowEdge[]
    )

    return NextResponse.json({
      from: { id: fromVersion.id, version: fromVersion.version },
      to: { id: toVersion.id, version: toVersion.version },
      diff,
      summary: {
        nodesAdded: diff.nodesAdded.length,
        nodesRemoved: diff.nodesRemoved.length,
        nodesModified: diff.nodesModified.length,
        edgesAdded: diff.edgesAdded.length,
        edgesRemoved: diff.edgesRemoved.length,
      },
    })
  } catch (error) {
    console.error("Version compare error:", error)
    return NextResponse.json(
      { error: "Failed to compare versions" },
      { status: 500 }
    )
  }
}
