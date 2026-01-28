import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { WorkflowEngine } from "@/lib/workflow-engine/engine"

export async function POST(
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
          select: { agencyId: true },
        },
      },
    })

    if (!instance) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 })
    }

    if (instance.workflow.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (instance.status !== "running") {
      return NextResponse.json(
        { error: "Instance is not running" },
        { status: 400 }
      )
    }

    // Try to stop the running instance
    const stopped = WorkflowEngine.stopInstance(instanceId)

    if (!stopped) {
      // Instance not in memory (maybe already finished), update DB directly
      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: {
          status: "stopped",
          completedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      instanceId,
      status: "stopped",
      message: "Workflow instance stopped",
    })
  } catch (error) {
    console.error("Instance stop error:", error)
    return NextResponse.json(
      { error: "Failed to stop instance" },
      { status: 500 }
    )
  }
}
