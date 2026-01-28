import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { WorkflowEngine } from "@/lib/workflow-engine/engine"
import { WorkflowNode, WorkflowEdge } from "@/types"
import { Prisma } from "@prisma/client"
import { z } from "zod"

const executeSchema = z.object({
  mode: z.enum(["sync", "async"]).default("async"),
  triggerData: z.record(z.string(), z.unknown()).default({}),
  workspaceId: z.string().min(1).optional(),
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
    const body = await request.json()
    const parsed = executeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { mode, triggerData, workspaceId: providedWorkspaceId } = parsed.data

    // Load workflow
    const workflow = await prisma.workflow.findUnique({
      where: { id, agencyId: session.user.agencyId },
    })

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    if (workflow.status !== "ACTIVE" && workflow.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Workflow is not in an executable state" },
        { status: 400 }
      )
    }

    // Resolve workspace: use provided, find existing, or create a test one
    let workspaceId = providedWorkspaceId
    if (workspaceId) {
      const workspace = await prisma.clientWorkspace.findUnique({
        where: { id: workspaceId },
        include: { client: true },
      })
      if (!workspace || workspace.client.agencyId !== session.user.agencyId) {
        return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
      }
    } else {
      // Find any existing workspace for this agency, or create a test one
      const existingWorkspace = await prisma.clientWorkspace.findFirst({
        where: { client: { agencyId: session.user.agencyId } },
      })
      if (existingWorkspace) {
        workspaceId = existingWorkspace.id
      } else {
        // Create a test client and workspace
        const testClient = await prisma.client.create({
          data: {
            agencyId: session.user.agencyId,
            name: "Test Client",
            email: "test@workflow-runner.local",
            status: "ACTIVE",
          },
        })
        const testWorkspace = await prisma.clientWorkspace.create({
          data: {
            clientId: testClient.id,
            name: "Test Workspace",
            settings: {} as unknown as Prisma.InputJsonValue,
          },
        })
        workspaceId = testWorkspace.id
      }
    }

    // Create instance
    const instance = await prisma.workflowInstance.create({
      data: {
        workflowId: workflow.id,
        workspaceId,
        status: "running",
        executionMode: mode,
        data: triggerData as unknown as Prisma.InputJsonValue,
        logs: [] as Prisma.InputJsonValue,
      },
    })

    const nodes = workflow.nodes as unknown as WorkflowNode[]
    const edges = workflow.edges as unknown as WorkflowEdge[]
    const variables = workflow.variables as Record<string, unknown>

    const engine = new WorkflowEngine(nodes, edges, {
      executionMode: mode,
      maxNodeExecutions: 1000,
    })

    if (mode === "sync") {
      // Execute synchronously and wait for result
      const result = await engine.execute({
        instanceId: instance.id,
        workflowId: workflow.id,
        workspaceId,
        triggerData,
        variables,
      })

      const updatedInstance = await prisma.workflowInstance.findUnique({
        where: { id: instance.id },
        include: { executions: { orderBy: { startedAt: "asc" } } },
      })

      const executionLogs = (updatedInstance?.executions || []).map((exec) => ({
        nodeId: exec.nodeId,
        nodeType: exec.nodeType,
        status: exec.status,
        duration: exec.duration,
        error: exec.error,
        output: exec.output,
      }))

      return NextResponse.json({
        instanceId: instance.id,
        status: updatedInstance?.status || "unknown",
        success: result.success,
        error: result.error,
        executionLogs,
        totalDuration: Date.now() - instance.startedAt.getTime(),
        nodesExecuted: executionLogs.length,
      })
    } else {
      // Execute asynchronously
      engine.execute({
        instanceId: instance.id,
        workflowId: workflow.id,
        workspaceId,
        triggerData,
        variables,
      }).catch(async (error) => {
        await prisma.workflowInstance.update({
          where: { id: instance.id },
          data: {
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error",
            completedAt: new Date(),
          },
        })
      })

      return NextResponse.json({
        instanceId: instance.id,
        status: "running",
        message: "Workflow execution started",
      })
    }
  } catch (error) {
    console.error("Workflow execution error:", error)
    return NextResponse.json(
      { error: "Failed to execute workflow" },
      { status: 500 }
    )
  }
}
