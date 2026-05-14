import { WorkflowNode } from '@/types'
import { ExecutionContext, NodeExecutionResult, NodeExecutor } from '../types'
import { prisma } from '@/lib/db'

/**
 * Reference another workflow as a node within this one.
 * Resolves the target via either a direct workflowId or a sharedComponentId
 * (when type=SUB_WORKFLOW). The sub-workflow runs in a child instance and
 * returns its final nodeOutputs as this node's output.
 */
export class SubWorkflowExecutor implements NodeExecutor {
  type = 'subWorkflow'

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const start = Date.now()
    const config = node.data.config as Record<string, unknown>
    const targetWorkflowId = config.workflowId as string | undefined
    const sharedComponentId = config.sharedComponentId as string | undefined
    const inputMapping = (config.inputMapping as Record<string, string>) || {}

    let workflowId = targetWorkflowId
    if (!workflowId && sharedComponentId) {
      const sc = await prisma.sharedComponent.findUnique({ where: { id: sharedComponentId } })
      if (!sc || sc.type !== 'SUB_WORKFLOW') {
        return { success: false, output: {}, error: 'SharedComponent is not a SUB_WORKFLOW', duration: Date.now() - start }
      }
      const content = sc.content as Record<string, unknown>
      workflowId = content.workflowId as string | undefined
    }

    if (!workflowId) {
      return { success: false, output: {}, error: 'No target workflow specified', duration: Date.now() - start }
    }

    const child = await prisma.workflow.findUnique({ where: { id: workflowId } })
    if (!child) {
      return { success: false, output: {}, error: 'Target workflow not found', duration: Date.now() - start }
    }

    // Build input from parent context using inputMapping (parent path → child variable)
    const childVariables: Record<string, unknown> = {}
    for (const [childKey, parentPath] of Object.entries(inputMapping)) {
      childVariables[childKey] = resolvePath(parentPath, context)
    }

    // Lazy import to avoid circular dependency
    const { WorkflowEngine } = await import('../engine')
    const engine = new WorkflowEngine(
      child.nodes as never,
      child.edges as never,
      { executionMode: 'sync', maxNodeExecutions: 200 },
    )

    const childInstance = await prisma.workflowInstance.create({
      data: {
        workflowId: child.id,
        workspaceId: context.workspaceId,
        status: 'running',
        executionMode: 'sync',
        data: { parentInstanceId: context.instanceId } as object,
      },
    })

    const result = await engine.execute({
      instanceId: childInstance.id,
      workflowId: child.id,
      workspaceId: context.workspaceId,
      triggerData: childVariables,
      variables: childVariables,
    })

    const finalChild = await prisma.workflowInstance.findUnique({ where: { id: childInstance.id } })

    return {
      success: result.success,
      output: {
        childInstanceId: childInstance.id,
        childWorkflowId: child.id,
        status: finalChild?.status,
        logs: finalChild?.logs,
      },
      error: result.error,
      duration: Date.now() - start,
    }
  }
}

function resolvePath(path: string, ctx: ExecutionContext): unknown {
  // Supports "trigger.X", "variables.X", "nodes.<id>.<field>"
  const parts = path.split('.')
  let cur: unknown =
    parts[0] === 'trigger' ? ctx.triggerData :
    parts[0] === 'variables' ? ctx.variables :
    parts[0] === 'nodes' ? ctx.nodeOutputs :
    undefined
  for (let i = 1; i < parts.length; i++) {
    if (cur && typeof cur === 'object' && parts[i] in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[parts[i]]
    } else {
      return undefined
    }
  }
  return cur
}
