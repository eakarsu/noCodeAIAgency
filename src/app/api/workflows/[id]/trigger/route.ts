import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { Prisma } from "@prisma/client"
import { WorkflowEngine } from "@/lib/workflow-engine/engine"
import { WorkflowNode, WorkflowEdge } from "@/types"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const apiKeyHeader = request.headers.get("X-API-Key")

    if (!apiKeyHeader) {
      return NextResponse.json({ error: "API key required" }, { status: 401 })
    }

    // Lookup API key
    const apiKey = await prisma.apiKey.findUnique({
      where: { key: apiKeyHeader },
      include: { agency: true },
    })

    if (!apiKey) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
    }

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return NextResponse.json({ error: "API key expired" }, { status: 401 })
    }

    // Check scopes
    if (!apiKey.scopes.includes("workflows:trigger")) {
      return NextResponse.json(
        { error: "API key does not have 'workflows:trigger' scope" },
        { status: 403 }
      )
    }

    // Load workflow and verify agency match
    const workflow = await prisma.workflow.findUnique({
      where: { id },
    })

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    if (workflow.agencyId !== apiKey.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (workflow.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Workflow is not active" },
        { status: 400 }
      )
    }

    // Update last used
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })

    // Parse trigger data from body
    let triggerData: Record<string, unknown> = {}
    try {
      triggerData = await request.json()
    } catch {
      triggerData = {}
    }

    // Find workspace
    const client = await prisma.client.findFirst({
      where: { agencyId: apiKey.agencyId },
      include: { workspace: true },
    })

    if (!client?.workspace) {
      return NextResponse.json(
        { error: "No workspace available for execution" },
        { status: 500 }
      )
    }

    // Create instance and execute
    const instance = await prisma.workflowInstance.create({
      data: {
        workflowId: workflow.id,
        workspaceId: client.workspace.id,
        status: "running",
        executionMode: "async",
        data: triggerData as unknown as Prisma.InputJsonValue,
        logs: [] as Prisma.InputJsonValue,
      },
    })

    const nodes = workflow.nodes as unknown as WorkflowNode[]
    const edges = workflow.edges as unknown as WorkflowEdge[]
    const variables = workflow.variables as Record<string, unknown>

    const engine = new WorkflowEngine(nodes, edges, { executionMode: "async" })
    engine.execute({
      instanceId: instance.id,
      workflowId: workflow.id,
      workspaceId: client.workspace.id,
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
      status: "triggered",
      workflowId: workflow.id,
    })
  } catch (error) {
    console.error("API trigger error:", error)
    return NextResponse.json(
      { error: "Failed to trigger workflow" },
      { status: 500 }
    )
  }
}
