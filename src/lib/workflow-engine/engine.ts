import { WorkflowNode, WorkflowEdge } from '@/types'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { ExecutionContext, EngineOptions, NodeExecutionResult, WorkflowGraph } from './types'
import { buildWorkflowGraph, findTriggerNode, getOutgoingNodeIds } from './graph'
import { getExecutor } from './executors'
import { sendWorkflowSuccessEmail, sendWorkflowFailureEmail } from '@/lib/email'

const DEFAULT_MAX_NODE_EXECUTIONS = 1000

// Track running instances for stop functionality
const runningInstances = new Map<string, ExecutionContext>()

export class WorkflowEngine {
  private graph: WorkflowGraph
  private context: ExecutionContext
  private options: EngineOptions

  constructor(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    options: EngineOptions = {}
  ) {
    this.graph = buildWorkflowGraph(nodes, edges)
    this.options = options
    this.context = {
      instanceId: '',
      workflowId: '',
      workspaceId: '',
      triggerData: {},
      variables: {},
      nodeOutputs: {},
      executionMode: options.executionMode || 'async',
      startedAt: new Date(),
      maxNodeExecutions: options.maxNodeExecutions || DEFAULT_MAX_NODE_EXECUTIONS,
      nodeExecutionCount: 0,
      stopped: false,
    }
  }

  async execute(params: {
    instanceId: string
    workflowId: string
    workspaceId: string
    triggerData: Record<string, unknown>
    variables: Record<string, unknown>
  }): Promise<{ success: boolean; error?: string }> {
    this.context.instanceId = params.instanceId
    this.context.workflowId = params.workflowId
    this.context.workspaceId = params.workspaceId
    this.context.triggerData = params.triggerData
    this.context.variables = { ...params.variables }
    this.context.startedAt = new Date()

    runningInstances.set(params.instanceId, this.context)

    try {
      const triggerNode = findTriggerNode(this.graph)
      if (!triggerNode) {
        await this.updateInstanceStatus('failed', 'No trigger node found')
        return { success: false, error: 'No trigger node found' }
      }

      await this.executeNode(triggerNode.id)

      if (this.context.stopped) {
        await this.updateInstanceStatus('stopped')
        return { success: true }
      }

      await this.updateInstanceStatus('completed')
      return { success: true }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown execution error'
      await this.updateInstanceStatus('failed', errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      runningInstances.delete(params.instanceId)
    }
  }

  private async executeNode(nodeId: string): Promise<void> {
    if (this.context.stopped) return

    if (this.context.nodeExecutionCount >= this.context.maxNodeExecutions) {
      throw new Error(`Maximum node execution limit (${this.context.maxNodeExecutions}) reached. Possible infinite loop.`)
    }

    const node = this.graph.nodes.get(nodeId)
    if (!node) {
      throw new Error(`Node ${nodeId} not found in workflow graph`)
    }

    this.context.nodeExecutionCount++

    // Update current node in instance
    await prisma.workflowInstance.update({
      where: { id: this.context.instanceId },
      data: { currentNode: nodeId },
    })

    // node.type is the top-level type (set by editor), node.data.type may also exist
    const nodeType = node.data?.type || node.type
    const executor = getExecutor(nodeType)
    if (!executor) {
      throw new Error(`No executor found for node type: ${nodeType}`)
    }

    const startTime = Date.now()
    let result: NodeExecutionResult

    try {
      result = await executor.execute(node, this.context)
    } catch (error) {
      result = {
        success: false,
        output: {},
        error: error instanceof Error ? error.message : 'Node execution failed',
        duration: Date.now() - startTime,
      }
    }

    // Record execution
    await prisma.workflowExecution.create({
      data: {
        instanceId: this.context.instanceId,
        nodeId: node.id,
        nodeType: nodeType,
        status: result.success ? 'completed' : 'failed',
        input: this.context.triggerData as unknown as Prisma.InputJsonValue,
        output: result.output as unknown as Prisma.InputJsonValue,
        error: result.error,
        duration: result.duration,
        completedAt: new Date(),
      },
    })

    // Store node output for variable resolution
    this.context.nodeOutputs[node.id] = result.output

    // Update instance logs
    const logs = await this.getInstanceLogs()
    logs.push({
      nodeId: node.id,
      nodeType: nodeType,
      status: result.success ? 'success' : 'error',
      duration: result.duration,
      timestamp: new Date().toISOString(),
      error: result.error,
    })
    await prisma.workflowInstance.update({
      where: { id: this.context.instanceId },
      data: { logs: logs as unknown as Prisma.InputJsonValue },
    })

    if (!result.success) {
      // Check for error handler connections
      const hasErrorHandler = this.findErrorHandler(nodeId)
      if (hasErrorHandler) {
        await this.executeNode(hasErrorHandler)
        return
      }
      throw new Error(`Node ${nodeId} (${node.data.type}) failed: ${result.error}`)
    }

    // Determine next nodes
    let nextNodeIds: string[]
    if (result.nextNodeIds && result.nextNodeIds.length > 0) {
      // Executor specified exact next nodes (conditions/loops)
      nextNodeIds = result.nextNodeIds
    } else {
      // Default: follow all outgoing edges
      nextNodeIds = getOutgoingNodeIds(this.graph, nodeId)
    }

    // Execute next nodes sequentially
    for (const nextId of nextNodeIds) {
      if (this.context.stopped) return
      await this.executeNode(nextId)
    }
  }

  private findErrorHandler(nodeId: string): string | null {
    const outgoing = this.graph.edges.filter(
      e => e.source === nodeId && e.sourceHandle === 'error'
    )
    return outgoing.length > 0 ? outgoing[0].target : null
  }

  private async getInstanceLogs(): Promise<Record<string, unknown>[]> {
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: this.context.instanceId },
      select: { logs: true },
    })
    const logs = instance?.logs
    if (Array.isArray(logs)) return logs as Record<string, unknown>[]
    return []
  }

  private async updateInstanceStatus(status: string, error?: string): Promise<void> {
    await prisma.workflowInstance.update({
      where: { id: this.context.instanceId },
      data: {
        status,
        error,
        completedAt: ['completed', 'failed', 'stopped'].includes(status)
          ? new Date()
          : undefined,
      },
    })

    // Send email notification on terminal states (non-blocking)
    if (status === 'completed' || status === 'failed') {
      this.sendExecutionNotification(status, error).catch(() => {})
    }
  }

  private async sendExecutionNotification(status: string, error?: string): Promise<void> {
    try {
      // Load workflow + agency owner email
      const workflow = await prisma.workflow.findUnique({
        where: { id: this.context.workflowId },
        include: {
          agency: {
            include: { owner: { select: { email: true } } },
          },
        },
      })

      if (!workflow?.agency?.owner?.email) return

      const ownerEmail = workflow.agency.owner.email
      const durationMs = Date.now() - this.context.startedAt.getTime()

      if (status === 'completed') {
        await sendWorkflowSuccessEmail(
          ownerEmail,
          workflow.name,
          this.context.instanceId,
          durationMs
        )
      } else if (status === 'failed') {
        await sendWorkflowFailureEmail(
          ownerEmail,
          workflow.name,
          this.context.instanceId,
          error ?? 'Unknown error'
        )
      }
    } catch {
      // Email errors should never affect workflow execution
    }
  }

  static stopInstance(instanceId: string): boolean {
    const context = runningInstances.get(instanceId)
    if (context) {
      context.stopped = true
      return true
    }
    return false
  }

  static isRunning(instanceId: string): boolean {
    return runningInstances.has(instanceId)
  }
}
