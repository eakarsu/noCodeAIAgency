import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

interface WorkflowStats {
  workflowId: string
  workflowName: string
  workflowStatus: string
  totalInstances: number
  successCount: number
  failedCount: number
  runningCount: number
  successRate: number
  avgDurationMs: number | null
  errorBreakdownByNodeType: Record<string, number>
}

/**
 * GET /api/analytics/workflows
 *
 * Returns per-workflow execution statistics for all workflows in the caller's agency.
 *
 * Query params:
 *   - workflowId  (optional) — filter to a single workflow
 *   - from        (optional) — ISO date string, filter instances started after this
 *   - to          (optional) — ISO date string, filter instances started before this
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !session.user.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const workflowIdFilter = searchParams.get('workflowId')
    const fromStr = searchParams.get('from')
    const toStr = searchParams.get('to')

    const fromDate = fromStr ? new Date(fromStr) : undefined
    const toDate = toStr ? new Date(toStr) : undefined

    // Fetch all workflows for this agency
    const workflows = await prisma.workflow.findMany({
      where: {
        agencyId: session.user.agencyId,
        ...(workflowIdFilter ? { id: workflowIdFilter } : {}),
      },
      select: {
        id: true,
        name: true,
        status: true,
      },
    })

    if (workflows.length === 0) {
      return NextResponse.json({ data: [], total: 0 })
    }

    const workflowIds = workflows.map((w) => w.id)

    // Fetch all instances in one query
    const instances = await prisma.workflowInstance.findMany({
      where: {
        workflowId: { in: workflowIds },
        ...(fromDate || toDate
          ? {
              startedAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
      },
      select: {
        id: true,
        workflowId: true,
        status: true,
        startedAt: true,
        completedAt: true,
      },
    })

    // Fetch all node-level executions for error breakdown
    const instanceIds = instances.map((i) => i.id)
    const nodeExecutions =
      instanceIds.length > 0
        ? await prisma.workflowExecution.findMany({
            where: {
              instanceId: { in: instanceIds },
              status: 'failed',
            },
            select: {
              instanceId: true,
              nodeType: true,
              error: true,
            },
          })
        : []

    // Build per-instance → nodeType error map
    const instanceErrorMap: Record<string, Record<string, number>> = {}
    for (const exec of nodeExecutions) {
      if (!instanceErrorMap[exec.instanceId]) {
        instanceErrorMap[exec.instanceId] = {}
      }
      const nodeType = exec.nodeType || 'unknown'
      instanceErrorMap[exec.instanceId][nodeType] =
        (instanceErrorMap[exec.instanceId][nodeType] ?? 0) + 1
    }

    // Aggregate per workflow
    const workflowMap = new Map(workflows.map((w) => [w.id, w]))
    const statsMap: Map<string, WorkflowStats> = new Map()

    for (const wf of workflows) {
      statsMap.set(wf.id, {
        workflowId: wf.id,
        workflowName: wf.name,
        workflowStatus: wf.status,
        totalInstances: 0,
        successCount: 0,
        failedCount: 0,
        runningCount: 0,
        successRate: 0,
        avgDurationMs: null,
        errorBreakdownByNodeType: {},
      })
    }

    const durationAccum: Map<string, number[]> = new Map()

    for (const instance of instances) {
      const stats = statsMap.get(instance.workflowId)
      if (!stats) continue

      stats.totalInstances++

      if (instance.status === 'completed') {
        stats.successCount++
      } else if (instance.status === 'failed') {
        stats.failedCount++
      } else if (instance.status === 'running') {
        stats.runningCount++
      }

      // Duration (only for completed/failed instances that have completedAt)
      if (instance.completedAt) {
        const duration = instance.completedAt.getTime() - instance.startedAt.getTime()
        if (!durationAccum.has(instance.workflowId)) {
          durationAccum.set(instance.workflowId, [])
        }
        durationAccum.get(instance.workflowId)!.push(duration)
      }

      // Error breakdown
      const errorMap = instanceErrorMap[instance.id]
      if (errorMap) {
        for (const [nodeType, count] of Object.entries(errorMap)) {
          stats.errorBreakdownByNodeType[nodeType] =
            (stats.errorBreakdownByNodeType[nodeType] ?? 0) + count
        }
      }
    }

    // Compute derived metrics
    for (const [wfId, stats] of statsMap.entries()) {
      const completed = stats.successCount + stats.failedCount
      stats.successRate = completed > 0 ? Math.round((stats.successCount / completed) * 100) : 0

      const durations = durationAccum.get(wfId)
      if (durations && durations.length > 0) {
        stats.avgDurationMs = Math.round(
          durations.reduce((a, b) => a + b, 0) / durations.length
        )
      }
    }

    const data = Array.from(statsMap.values()).sort(
      (a, b) => b.totalInstances - a.totalInstances
    )

    return NextResponse.json({
      data,
      total: data.length,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Analytics] workflows error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
