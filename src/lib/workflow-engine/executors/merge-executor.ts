import { WorkflowNode } from '@/types'
import { ExecutionContext, NodeExecutionResult, NodeExecutor } from '../types'

export class MergeExecutor implements NodeExecutor {
  type = 'merge'

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const start = Date.now()
    const config = node.data.config as Record<string, unknown>
    const strategy = (config.strategy as string) || 'wait_all'
    const inputNodes = config.inputNodes as string[] || []

    // Collect outputs from all input nodes
    const collectedOutputs: Record<string, unknown> = {}
    for (const inputNodeId of inputNodes) {
      if (context.nodeOutputs[inputNodeId]) {
        collectedOutputs[inputNodeId] = context.nodeOutputs[inputNodeId]
      }
    }

    // If no specific input nodes configured, collect all available outputs
    if (inputNodes.length === 0) {
      Object.assign(collectedOutputs, context.nodeOutputs)
    }

    let mergedOutput: Record<string, unknown>

    switch (strategy) {
      case 'combine':
        // Combine all outputs into a single object
        mergedOutput = { merged: collectedOutputs }
        break
      case 'array':
        // Collect as array
        mergedOutput = { items: Object.values(collectedOutputs) }
        break
      case 'first':
        // Take first available
        mergedOutput = { result: Object.values(collectedOutputs)[0] || {} }
        break
      case 'wait_all':
      default:
        // Default: merge all into flat object
        mergedOutput = {}
        for (const output of Object.values(collectedOutputs)) {
          if (typeof output === 'object' && output !== null) {
            Object.assign(mergedOutput, output)
          }
        }
        break
    }

    return {
      success: true,
      output: {
        ...mergedOutput,
        mergeStrategy: strategy,
        inputCount: Object.keys(collectedOutputs).length,
      },
      duration: Date.now() - start,
    }
  }
}
