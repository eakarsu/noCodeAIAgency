import { WorkflowNode } from '@/types'
import { ExecutionContext, NodeExecutionResult, NodeExecutor } from '../types'
import { resolveVariables } from '../variable-resolver'

interface FilterCondition {
  field: string
  operator: string
  value: string
}

export class FilterExecutor implements NodeExecutor {
  type = 'filter'

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const start = Date.now()
    const config = node.data.config as Record<string, unknown>
    const inputPath = config.input as string || ''
    const conditions = config.conditions as FilterCondition[] || []
    const logic = (config.logic as string) || 'and'

    try {
      const resolved = resolveVariables(`{{${inputPath}}}`, context)
      let items: unknown[] = []
      try {
        items = JSON.parse(resolved)
      } catch {
        items = Array.isArray(resolved) ? resolved : [resolved]
      }

      if (!Array.isArray(items)) {
        items = [items]
      }

      const filtered = items.filter(item => {
        const results = conditions.map(cond => {
          const itemValue = typeof item === 'object' && item !== null
            ? (item as Record<string, unknown>)[cond.field]
            : item
          return this.evaluate(String(itemValue ?? ''), cond.operator, cond.value)
        })
        return logic === 'and' ? results.every(r => r) : results.some(r => r)
      })

      return {
        success: true,
        output: {
          filtered,
          originalCount: items.length,
          filteredCount: filtered.length,
          removedCount: items.length - filtered.length,
        },
        duration: Date.now() - start,
      }
    } catch (error) {
      return {
        success: false,
        output: {},
        error: error instanceof Error ? error.message : 'Filter execution failed',
        duration: Date.now() - start,
      }
    }
  }

  private evaluate(value: string, operator: string, compareValue: string): boolean {
    switch (operator) {
      case 'equals': return value === compareValue
      case 'not_equals': return value !== compareValue
      case 'contains': return value.includes(compareValue)
      case 'not_contains': return !value.includes(compareValue)
      case 'greater_than': return Number(value) > Number(compareValue)
      case 'less_than': return Number(value) < Number(compareValue)
      case 'is_empty': return !value || value === 'undefined' || value === 'null'
      case 'is_not_empty': return !!value && value !== 'undefined' && value !== 'null'
      case 'starts_with': return value.startsWith(compareValue)
      case 'ends_with': return value.endsWith(compareValue)
      case 'matches': return new RegExp(compareValue).test(value)
      default: return true
    }
  }
}
