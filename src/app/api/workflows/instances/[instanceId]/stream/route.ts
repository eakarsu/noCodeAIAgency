import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"

/**
 * SSE stream of a workflow instance's live state.
 * Polls the WorkflowInstance + executions every 1s and emits diffs.
 *
 * Client usage:
 *   const es = new EventSource('/api/workflows/instances/<id>/stream')
 *   es.addEventListener('node', e => render(JSON.parse(e.data)))
 *   es.addEventListener('done', () => es.close())
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { instanceId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.agencyId) {
    return new Response("Unauthorized", { status: 401 })
  }

  const instance = await prisma.workflowInstance.findUnique({
    where: { id: params.instanceId },
    include: { workflow: { include: { agency: true } } },
  })
  if (!instance || instance.workflow.agencyId !== session.user.agencyId) {
    return new Response("Not found", { status: 404 })
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let lastExecutionId: string | null = null
      let pollCount = 0
      const maxPolls = 600 // 10 minutes max

      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      send("init", { instanceId: instance.id, status: instance.status })

      const interval = setInterval(async () => {
        pollCount++
        try {
          const fresh = await prisma.workflowInstance.findUnique({
            where: { id: instance.id },
          })
          const executions = await prisma.workflowExecution.findMany({
            where: { instanceId: instance.id, ...(lastExecutionId ? { id: { gt: lastExecutionId } } : {}) },
            orderBy: { startedAt: "asc" },
            take: 50,
          })
          for (const ex of executions) {
            send("node", {
              nodeId: ex.nodeId,
              nodeType: ex.nodeType,
              status: ex.status,
              durationMs: ex.duration,
              output: ex.output,
              error: ex.error,
              startedAt: ex.startedAt.toISOString(),
            })
            lastExecutionId = ex.id
          }
          if (fresh && ["completed", "failed", "stopped"].includes(fresh.status)) {
            send("done", { status: fresh.status, completedAt: fresh.completedAt })
            clearInterval(interval)
            controller.close()
          } else if (pollCount >= maxPolls) {
            send("timeout", { reason: "stream timeout after 10m" })
            clearInterval(interval)
            controller.close()
          }
        } catch (err) {
          send("error", { message: err instanceof Error ? err.message : "stream error" })
          clearInterval(interval)
          controller.close()
        }
      }, 1000)

      request.signal.addEventListener("abort", () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
