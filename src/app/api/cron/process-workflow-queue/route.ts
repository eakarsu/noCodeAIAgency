import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { WorkflowEngine } from "@/lib/workflow-engine/engine"

/**
 * Cron worker that drains the WorkflowQueueJob table.
 * Called by Vercel cron / external scheduler.
 *
 * Header guard: x-cron-secret must equal CRON_SECRET env var in production.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret")
  if (process.env.NODE_ENV === "production" && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  // Pick up to 5 PENDING jobs whose scheduledFor has passed
  const jobs = await prisma.workflowQueueJob.findMany({
    where: { status: "PENDING", scheduledFor: { lte: now } },
    orderBy: { scheduledFor: "asc" },
    take: 5,
  })

  const processed: string[] = []
  for (const job of jobs) {
    await prisma.workflowQueueJob.update({
      where: { id: job.id },
      data: { status: "RUNNING", pickedUpAt: now, attemptCount: { increment: 1 } },
    })

    try {
      const wf = await prisma.workflow.findUnique({ where: { id: job.workflowId } })
      if (!wf) throw new Error("Workflow not found")

      const instance = await prisma.workflowInstance.create({
        data: {
          workflowId: wf.id,
          workspaceId: job.workspaceId,
          status: "running",
          executionMode: "async",
          data: { queueJobId: job.id } as object,
        },
      })

      const engine = new WorkflowEngine(wf.nodes as never, wf.edges as never, { executionMode: "async" })
      const start = Date.now()
      const result = await engine.execute({
        instanceId: instance.id,
        workflowId: wf.id,
        workspaceId: job.workspaceId,
        triggerData: (job.triggerData || {}) as Record<string, unknown>,
        variables: (job.variables || {}) as Record<string, unknown>,
      })
      const durationMs = Date.now() - start

      // Persist replay snapshot
      const final = await prisma.workflowInstance.findUnique({ where: { id: instance.id } })
      await prisma.executionReplay.upsert({
        where: { instanceId: instance.id },
        create: {
          instanceId: instance.id,
          workflowId: wf.id,
          agencyId: job.agencyId,
          nodeOutputs: (final?.data || {}) as object,
          variables: (job.variables || {}) as object,
          triggerData: (job.triggerData || {}) as object,
          durationMs,
        },
        update: {
          nodeOutputs: (final?.data || {}) as object,
          durationMs,
        },
      })

      await prisma.workflowQueueJob.update({
        where: { id: job.id },
        data: {
          status: result.success ? "COMPLETED" : (job.attemptCount + 1 >= job.maxAttempts ? "FAILED" : "PENDING"),
          completedAt: result.success ? new Date() : undefined,
          instanceId: instance.id,
          error: result.error,
          scheduledFor: !result.success ? new Date(Date.now() + 60_000) : undefined, // 1m backoff
        },
      })
      processed.push(job.id)
    } catch (err) {
      await prisma.workflowQueueJob.update({
        where: { id: job.id },
        data: {
          status: job.attemptCount + 1 >= job.maxAttempts ? "FAILED" : "PENDING",
          error: err instanceof Error ? err.message : String(err),
          scheduledFor: new Date(Date.now() + 60_000),
        },
      })
    }
  }

  return NextResponse.json({ ok: true, processed: processed.length, jobIds: processed })
}
