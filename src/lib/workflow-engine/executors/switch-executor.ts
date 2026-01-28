import { WorkflowNode } from '@/types'
import { ExecutionContext, NodeExecutionResult, NodeExecutor } from '../types'
import { resolveVariables } from '../variable-resolver'

export class SwitchExecutor implements NodeExecutor {
  type = 'switch'

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const start = Date.now()
    const config = node.data.config as Record<string, unknown>
    const field = config.field as string || ''
    const cases = config.cases as Array<{ value: string; targetNodeId: string }> || []
    const defaultTarget = config.defaultTarget as string | undefined

    try {
      const fieldValue = resolveVariables(`{{${field}}}`, context)

      let matchedTarget: string | undefined
      let matchedCase: string | undefined

      for (const c of cases) {
        const caseValue = resolveVariables(c.value, context)
        if (fieldValue === caseValue) {
          matchedTarget = c.targetNodeId
          matchedCase = c.value
          break
        }
      }

      const nextNodeIds: string[] = []
      if (matchedTarget) {
        nextNodeIds.push(matchedTarget)
      } else if (defaultTarget) {
        nextNodeIds.push(defaultTarget)
      }

      return {
        success: true,
        output: {
          evaluatedValue: fieldValue,
          matchedCase: matchedCase || 'default',
          casesChecked: cases.length,
        },
        nextNodeIds: nextNodeIds.length > 0 ? nextNodeIds : undefined,
        duration: Date.now() - start,
      }
    } catch (error) {
      return {
        success: false,
        output: {},
        error: error instanceof Error ? error.message : 'Switch evaluation failed',
        duration: Date.now() - start,
      }
    }
  }
}
