import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { WorkflowEngine } from "@/lib/workflow-engine/engine"

/**
 * POST /api/replays/[id]/replay
 * Re-runs a workflow with the same triggerData (optionally mutated).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const replay = await prisma.executionReplay.findFirst({
    where: { id: params.id, agencyId: session.user.agencyId },
  })
  if (!replay) return NextResponse.json({ error: "Replay not found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const triggerData = body.triggerData ?? (replay.triggerData as Record<string, unknown>)
  const variables = body.variables ?? (replay.variables as Record<string, unknown>)

  const workflow = await prisma.workflow.findUnique({ where: { id: replay.workflowId } })
  if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 })

  const workspace = await prisma.clientWorkspace.findFirst({
    where: { client: { agencyId: session.user.agencyId } },
  })
  if (!workspace) return NextResponse.json({ error: "No workspace available" }, { status: 400 })

  const instance = await prisma.workflowInstance.create({
    data: {
      workflowId: workflow.id,
      workspaceId: workspace.id,
      status: "running",
      executionMode: "sync",
      data: { replayedFrom: replay.id } as object,
    },
  })

  const engine = new WorkflowEngine(workflow.nodes as never, workflow.edges as never, { executionMode: "sync" })
  const result = await engine.execute({
    instanceId: instance.id,
    workflowId: workflow.id,
    workspaceId: workspace.id,
    triggerData,
    variables,
  })

  return NextResponse.json({ instanceId: instance.id, ...result })
}
