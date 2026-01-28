import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !session.user.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { instanceId } = await params

    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        workflow: {
          select: { id: true, name: true, agencyId: true },
        },
        executions: {
          orderBy: { startedAt: "asc" },
        },
      },
    })

    if (!instance) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 })
    }

    if (instance.workflow.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({
      id: instance.id,
      workflowId: instance.workflowId,
      workflowName: instance.workflow.name,
      status: instance.status,
      currentNode: instance.currentNode,
      executionMode: instance.executionMode,
      error: instance.error,
      logs: instance.logs,
      data: instance.data,
      startedAt: instance.startedAt,
      completedAt: instance.completedAt,
      executions: instance.executions,
    })
  } catch (error) {
    console.error("Instance fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch instance" },
      { status: 500 }
    )
  }
}
