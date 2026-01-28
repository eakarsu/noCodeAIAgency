import { WorkflowNode } from '@/types'
import { ExecutionContext, NodeExecutionResult, NodeExecutor } from '../types'
import { resolveVariables } from '../variable-resolver'

const MAX_ITERATIONS = 1000

export class LoopExecutor implements NodeExecutor {
  type = 'loop'

  private iterationCounters: Map<string, number> = new Map()

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const start = Date.now()
    const config = node.data.config as Record<string, unknown>
    const loopType = (config.loopType as string) || 'count'
    const maxIterations = Math.min(
      (config.maxIterations as number) || MAX_ITERATIONS,
      MAX_ITERATIONS
    )

    const counterKey = `${context.instanceId}:${node.id}`
    const currentIteration = this.iterationCounters.get(counterKey) || 0

    try {
      let shouldContinue = false
      let iterationData: Record<string, unknown> = {}

      switch (loopType) {
        case 'count': {
          const count = Number(resolveVariables(String(config.count || '0'), context))
          shouldContinue = currentIteration < count && currentIteration < maxIterations
          iterationData = { index: currentIteration, total: count }
          break
        }
        case 'collection': {
          const collectionPath = config.collection as string || ''
          const resolved = resolveVariables(`{{${collectionPath}}}`, context)
          let items: unknown[] = []
          try {
            items = JSON.parse(resolved)
          } catch {
            items = []
          }
          shouldContinue = currentIteration < items.length && currentIteration < maxIterations
          iterationData = {
            index: currentIteration,
            total: items.length,
            currentItem: items[currentIteration],
          }
          break
        }
        case 'condition': {
          const conditionField = config.conditionField as string || ''
          const conditionValue = resolveVariables(`{{${conditionField}}}`, context)
          shouldContinue = conditionValue === 'true' && currentIteration < maxIterations
          iterationData = { index: currentIteration }
          break
        }
      }

      if (shouldContinue) {
        this.iterationCounters.set(counterKey, currentIteration + 1)
        const loopBodyTargets = config.loopBodyTargets as string[] || []

        return {
          success: true,
          output: {
            continuing: true,
            iteration: currentIteration,
            ...iterationData,
          },
          nextNodeIds: loopBodyTargets.length > 0 ? loopBodyTargets : undefined,
          duration: Date.now() - start,
        }
      } else {
        // Loop completed - clean up and proceed to exit targets
        this.iterationCounters.delete(counterKey)
        const exitTargets = config.exitTargets as string[] || []

        return {
          success: true,
          output: {
            continuing: false,
            totalIterations: currentIteration,
            ...iterationData,
          },
          nextNodeIds: exitTargets.length > 0 ? exitTargets : undefined,
          duration: Date.now() - start,
        }
      }
    } catch (error) {
      this.iterationCounters.delete(counterKey)
      return {
        success: false,
        output: {},
        error: error instanceof Error ? error.message : 'Loop execution failed',
        duration: Date.now() - start,
      }
    }
  }

  resetCounter(instanceId: string, nodeId: string): void {
    this.iterationCounters.delete(`${instanceId}:${nodeId}`)
  }
}
