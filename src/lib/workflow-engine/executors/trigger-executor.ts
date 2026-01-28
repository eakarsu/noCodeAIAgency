import { WorkflowNode } from '@/types'
import { ExecutionContext, NodeExecutionResult, NodeExecutor } from '../types'

export class TriggerExecutor implements NodeExecutor {
  type = 'trigger'

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const start = Date.now()

    // Trigger nodes pass through the trigger data as output
    const output: Record<string, unknown> = {
      ...context.triggerData,
      triggeredAt: context.startedAt.toISOString(),
      triggerType: node.data.config.triggerType || 'manual',
    }

    return {
      success: true,
      output,
      duration: Date.now() - start,
    }
  }
}
