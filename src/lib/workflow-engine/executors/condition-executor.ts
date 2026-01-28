import { WorkflowNode } from '@/types'
import { ExecutionContext, NodeExecutionResult, NodeExecutor } from '../types'
import { resolveVariables } from '../variable-resolver'

type ComparisonOperator = 'equals' | 'not_equals' | 'greater_than' | 'less_than' |
  'greater_than_or_equal' | 'less_than_or_equal' | 'contains' | 'not_contains' |
  'starts_with' | 'ends_with' | 'is_empty' | 'is_not_empty'

interface Condition {
  field: string
  operator: ComparisonOperator
  value?: string
}

export class ConditionExecutor implements NodeExecutor {
  type = 'condition'

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const start = Date.now()
    const config = node.data.config as Record<string, unknown>
    const conditions = config.conditions as Condition[] || []
    const logicOperator = (config.logic as string) || 'and'
    const trueTargets = config.trueTargets as string[] || []
    const falseTargets = config.falseTargets as string[] || []

    try {
      const results = conditions.map(condition => this.evaluateCondition(condition, context))
      const result = logicOperator === 'and'
        ? results.every(r => r)
        : results.some(r => r)

      const nextNodeIds = result ? trueTargets : falseTargets

      return {
        success: true,
        output: {
          result,
          conditionsEvaluated: conditions.length,
          logic: logicOperator,
        },
        nextNodeIds: nextNodeIds.length > 0 ? nextNodeIds : undefined,
        duration: Date.now() - start,
      }
    } catch (error) {
      return {
        success: false,
        output: {},
        error: error instanceof Error ? error.message : 'Condition evaluation failed',
        duration: Date.now() - start,
      }
    }
  }

  private evaluateCondition(condition: Condition, context: ExecutionContext): boolean {
    const fieldValue = resolveVariables(`{{${condition.field}}}`, context)
    const compareValue = condition.value
      ? resolveVariables(condition.value, context)
      : ''

    switch (condition.operator) {
      case 'equals':
        return fieldValue === compareValue
      case 'not_equals':
        return fieldValue !== compareValue
      case 'greater_than':
        return Number(fieldValue) > Number(compareValue)
      case 'less_than':
        return Number(fieldValue) < Number(compareValue)
      case 'greater_than_or_equal':
        return Number(fieldValue) >= Number(compareValue)
      case 'less_than_or_equal':
        return Number(fieldValue) <= Number(compareValue)
      case 'contains':
        return String(fieldValue).includes(String(compareValue))
      case 'not_contains':
        return !String(fieldValue).includes(String(compareValue))
      case 'starts_with':
        return String(fieldValue).startsWith(String(compareValue))
      case 'ends_with':
        return String(fieldValue).endsWith(String(compareValue))
      case 'is_empty':
        return !fieldValue || fieldValue === '' || fieldValue === '{{' + condition.field + '}}'
      case 'is_not_empty':
        return !!fieldValue && fieldValue !== '' && fieldValue !== '{{' + condition.field + '}}'
      default:
        return false
    }
  }
}
