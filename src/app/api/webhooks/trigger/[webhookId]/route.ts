import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { Prisma } from "@prisma/client"
import { validateSignature, checkRateLimit } from "@/lib/webhook-utils"
import { WorkflowEngine } from "@/lib/workflow-engine/engine"
import { WorkflowNode, WorkflowEdge } from "@/types"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  const startTime = Date.now()
  const { webhookId } = await params

  try {
    // Load webhook trigger
    const trigger = await prisma.webhookTrigger.findUnique({
      where: { id: webhookId },
      include: {
        workflow: true,
      },
    })

    if (!trigger) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 })
    }

    if (!trigger.isActive) {
      return NextResponse.json({ error: "Webhook is inactive" }, { status: 403 })
    }

    // Rate limit check
    const rateLimit = await checkRateLimit(trigger.id, trigger.rateLimitPerMinute)
    if (!rateLimit.allowed) {
      await logTriggerInvocation(trigger.id, request, null, 429, startTime)
      return NextResponse.json(
        { error: "Rate limit exceeded", remaining: rateLimit.remaining },
        { status: 429 }
      )
    }

    // Get raw body for signature validation
    const rawBody = await request.text()
    const signature = request.headers.get("X-Webhook-Signature") || ""

    if (!validateSignature(rawBody, signature, trigger.secret)) {
      await logTriggerInvocation(trigger.id, request, null, 401, startTime)
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // Parse body
    let body: Record<string, unknown> = {}
    try {
      body = JSON.parse(rawBody)
    } catch {
      body = { raw: rawBody }
    }

    // Find or create a workspace for execution
    const client = await prisma.client.findFirst({
      where: { agencyId: trigger.agencyId },
      include: { workspace: true },
    })

    if (!client?.workspace) {
      await logTriggerInvocation(trigger.id, request, null, 500, startTime)
      return NextResponse.json(
        { error: "No workspace available for execution" },
        { status: 500 }
      )
    }

    // Create workflow instance
    const instance = await prisma.workflowInstance.create({
      data: {
        workflowId: trigger.workflowId,
        workspaceId: client.workspace.id,
        status: "running",
        executionMode: "async",
        data: body as unknown as Prisma.InputJsonValue,
        logs: [] as Prisma.InputJsonValue,
      },
    })

    // Update last triggered timestamp
    await prisma.webhookTrigger.update({
      where: { id: trigger.id },
      data: { lastTriggeredAt: new Date() },
    })

    // Start workflow execution
    const nodes = trigger.workflow.nodes as unknown as WorkflowNode[]
    const edges = trigger.workflow.edges as unknown as WorkflowEdge[]
    const variables = trigger.workflow.variables as Record<string, unknown>

    const engine = new WorkflowEngine(nodes, edges, { executionMode: "async" })
    engine.execute({
      instanceId: instance.id,
      workflowId: trigger.workflowId,
      workspaceId: client.workspace.id,
      triggerData: body,
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

    await logTriggerInvocation(trigger.id, request, instance.id, 200, startTime, body)

    return NextResponse.json({
      instanceId: instance.id,
      status: "triggered",
    })
  } catch (error) {
    console.error("Webhook trigger error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function logTriggerInvocation(
  triggerId: string,
  request: NextRequest,
  instanceId: string | null,
  statusCode: number,
  startTime: number,
  body?: Record<string, unknown>
) {
  try {
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key] = value
    })

    await prisma.webhookTriggerLog.create({
      data: {
        triggerId,
        method: request.method,
        headers: headers as unknown as Prisma.InputJsonValue,
        body: (body || {}) as unknown as Prisma.InputJsonValue,
        statusCode,
        instanceId,
        duration: Date.now() - startTime,
      },
    })
  } catch {
    // Logging failure shouldn't break the response
  }
}
