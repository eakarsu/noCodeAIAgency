import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"

/**
 * POST /api/workflows/[id]/queue
 * Schedule a workflow run as a queued job. The cron worker
 * /api/cron/process-workflow-queue picks PENDING jobs up.
 *
 * This is the production-safe alternative to /execute, which runs
 * synchronously inside the HTTP request and times out on Vercel.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const wf = await prisma.workflow.findFirst({
    where: { id: params.id, agencyId: session.user.agencyId },
  })
  if (!wf) return NextResponse.json({ error: "Workflow not found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const workspace = await prisma.clientWorkspace.findFirst({
    where: { client: { agencyId: session.user.agencyId } },
  })
  if (!workspace) return NextResponse.json({ error: "No workspace found" }, { status: 400 })

  const job = await prisma.workflowQueueJob.create({
    data: {
      workflowId: wf.id,
      agencyId: session.user.agencyId,
      workspaceId: workspace.id,
      triggerData: (body.triggerData ?? {}) as object,
      variables: (body.variables ?? {}) as object,
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : new Date(),
    },
  })
  return NextResponse.json({ jobId: job.id, status: job.status }, { status: 202 })
}

/**
 * GET /api/workflows/[id]/queue?page=&pageSize=
 * Paginated queued/running history for this workflow.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get("page") || "1")
  const pageSize = parseInt(searchParams.get("pageSize") || "20")
  const where = { workflowId: params.id, agencyId: session.user.agencyId }
  const [data, total] = await Promise.all([
    prisma.workflowQueueJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.workflowQueueJob.count({ where }),
  ])
  return NextResponse.json({ data, page, pageSize, total, totalPages: Math.ceil(total / pageSize) })
}
