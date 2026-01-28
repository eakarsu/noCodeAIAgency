import { WorkflowNode } from '@/types'
import { ExecutionContext, NodeExecutionResult, NodeExecutor } from '../types'

export class SplitExecutor implements NodeExecutor {
  type = 'split'

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const start = Date.now()
    const config = node.data.config as Record<string, unknown>
    const branches = config.branches as string[] || []

    // Split node passes data through to all branches
    // The engine will execute all nextNodeIds
    return {
      success: true,
      output: {
        splitAt: new Date().toISOString(),
        branchCount: branches.length || undefined,
        data: context.triggerData,
      },
      nextNodeIds: branches.length > 0 ? branches : undefined,
      duration: Date.now() - start,
    }
  }
}
