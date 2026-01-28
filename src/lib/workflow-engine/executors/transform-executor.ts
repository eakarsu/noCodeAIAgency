import { WorkflowNode } from '@/types'
import { ExecutionContext, NodeExecutionResult, NodeExecutor } from '../types'
import { resolveVariables } from '../variable-resolver'

export class TransformExecutor implements NodeExecutor {
  type = 'transform'

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const start = Date.now()
    const config = node.data.config as Record<string, unknown>
    const operation = (config.operation as string) || 'passthrough'

    try {
      let output: Record<string, unknown>

      switch (operation) {
        case 'map_fields':
          output = this.mapFields(config, context)
          break
        case 'aggregate':
          output = this.aggregate(config, context)
          break
        case 'lookup':
          output = this.lookup(config, context)
          break
        case 'parse_json':
          output = this.parseJson(config, context)
          break
        case 'set_variable':
          output = this.setVariable(config, context)
          break
        case 'array_operation':
          output = this.arrayOperation(config, context)
          break
        case 'math':
          output = this.math(config, context)
          break
        case 'string_operation':
          output = this.stringOperation(config, context)
          break
        case 'date_operation':
          output = this.dateOperation(config, context)
          break
        default:
          // Passthrough - forward previous node output
          output = { ...context.nodeOutputs }
      }

      return {
        success: true,
        output,
        duration: Date.now() - start,
      }
    } catch (error) {
      return {
        success: false,
        output: {},
        error: error instanceof Error ? error.message : 'Transform failed',
        duration: Date.now() - start,
      }
    }
  }

  private mapFields(config: Record<string, unknown>, context: ExecutionContext): Record<string, unknown> {
    const mappings = config.mappings as Array<{ from: string; to: string }> || []
    const result: Record<string, unknown> = {}

    for (const mapping of mappings) {
      const value = resolveVariables(`{{${mapping.from}}}`, context)
      result[mapping.to] = value
    }

    return { mapped: result }
  }

  private aggregate(config: Record<string, unknown>, context: ExecutionContext): Record<string, unknown> {
    const inputPath = config.input as string || ''
    const operation = config.aggregateOp as string || 'count'
    const field = config.aggregateField as string || ''

    const resolved = resolveVariables(`{{${inputPath}}}`, context)
    let items: unknown[] = []
    try {
      items = JSON.parse(resolved)
    } catch {
      items = []
    }

    switch (operation) {
      case 'count':
        return { result: items.length }
      case 'sum': {
        const sum = items.reduce((acc: number, item) => {
          const val = typeof item === 'object' && item !== null
            ? Number((item as Record<string, unknown>)[field] || 0)
            : Number(item || 0)
          return acc + val
        }, 0)
        return { result: sum }
      }
      case 'average': {
        const total = items.reduce((acc: number, item) => {
          const val = typeof item === 'object' && item !== null
            ? Number((item as Record<string, unknown>)[field] || 0)
            : Number(item || 0)
          return acc + val
        }, 0)
        return { result: items.length > 0 ? total / items.length : 0 }
      }
      case 'min': {
        const values = items.map(item => {
          return typeof item === 'object' && item !== null
            ? Number((item as Record<string, unknown>)[field] || 0)
            : Number(item || 0)
        })
        return { result: Math.min(...values) }
      }
      case 'max': {
        const values = items.map(item => {
          return typeof item === 'object' && item !== null
            ? Number((item as Record<string, unknown>)[field] || 0)
            : Number(item || 0)
        })
        return { result: Math.max(...values) }
      }
      case 'group': {
        const groups: Record<string, unknown[]> = {}
        for (const item of items) {
          const key = typeof item === 'object' && item !== null
            ? String((item as Record<string, unknown>)[field] || 'undefined')
            : String(item)
          if (!groups[key]) groups[key] = []
          groups[key].push(item)
        }
        return { result: groups }
      }
      default:
        return { result: items }
    }
  }

  private lookup(config: Record<string, unknown>, context: ExecutionContext): Record<string, unknown> {
    const sourcePath = config.source as string || ''
    const key = config.lookupKey as string || ''
    const value = config.lookupValue as string || ''

    const resolved = resolveVariables(`{{${sourcePath}}}`, context)
    const resolvedValue = resolveVariables(value, context)
    let items: unknown[] = []
    try {
      items = JSON.parse(resolved)
    } catch {
      items = []
    }

    const found = items.find(item => {
      if (typeof item === 'object' && item !== null) {
        return String((item as Record<string, unknown>)[key]) === resolvedValue
      }
      return String(item) === resolvedValue
    })

    return { found: found || null, exists: !!found }
  }

  private parseJson(config: Record<string, unknown>, context: ExecutionContext): Record<string, unknown> {
    const inputPath = config.input as string || ''
    const resolved = resolveVariables(`{{${inputPath}}}`, context)

    try {
      const parsed = JSON.parse(resolved)
      return { parsed, valid: true }
    } catch {
      return { parsed: null, valid: false, raw: resolved }
    }
  }

  private setVariable(config: Record<string, unknown>, context: ExecutionContext): Record<string, unknown> {
    const variableName = config.variableName as string || ''
    const value = config.value as string || ''
    const resolvedValue = resolveVariables(value, context)

    // Set in context for subsequent nodes
    context.variables[variableName] = resolvedValue

    return { [variableName]: resolvedValue, set: true }
  }

  private arrayOperation(config: Record<string, unknown>, context: ExecutionContext): Record<string, unknown> {
    const inputPath = config.input as string || ''
    const op = config.arrayOp as string || 'flatten'

    const resolved = resolveVariables(`{{${inputPath}}}`, context)
    let items: unknown[] = []
    try {
      items = JSON.parse(resolved)
    } catch {
      items = []
    }

    switch (op) {
      case 'flatten':
        return { result: items.flat() }
      case 'unique':
        return { result: [...new Set(items.map(i => JSON.stringify(i)))].map(i => JSON.parse(i)) }
      case 'reverse':
        return { result: [...items].reverse() }
      case 'sort':
        return { result: [...items].sort() }
      case 'first':
        return { result: items[0] || null }
      case 'last':
        return { result: items[items.length - 1] || null }
      case 'slice': {
        const from = config.from as number || 0
        const to = config.to as number || items.length
        return { result: items.slice(from, to) }
      }
      case 'push': {
        const newItem = config.item as unknown
        return { result: [...items, newItem] }
      }
      case 'length':
        return { result: items.length }
      default:
        return { result: items }
    }
  }

  private math(config: Record<string, unknown>, context: ExecutionContext): Record<string, unknown> {
    const op = config.mathOp as string || 'add'
    const aStr = resolveVariables(String(config.a || '0'), context)
    const bStr = resolveVariables(String(config.b || '0'), context)
    const a = Number(aStr)
    const b = Number(bStr)

    switch (op) {
      case 'add': return { result: a + b }
      case 'subtract': return { result: a - b }
      case 'multiply': return { result: a * b }
      case 'divide': return { result: b !== 0 ? a / b : 0 }
      case 'modulo': return { result: b !== 0 ? a % b : 0 }
      case 'power': return { result: Math.pow(a, b) }
      case 'round': return { result: Math.round(a) }
      case 'floor': return { result: Math.floor(a) }
      case 'ceil': return { result: Math.ceil(a) }
      case 'abs': return { result: Math.abs(a) }
      case 'random': return { result: Math.random() * (b - a) + a }
      default: return { result: a }
    }
  }

  private stringOperation(config: Record<string, unknown>, context: ExecutionContext): Record<string, unknown> {
    const op = config.stringOp as string || 'concat'
    const input = resolveVariables(String(config.input || ''), context)
    const param = config.param ? resolveVariables(String(config.param), context) : ''

    switch (op) {
      case 'concat': return { result: input + param }
      case 'split': return { result: input.split(param || ',') }
      case 'replace': {
        const replacement = config.replacement ? resolveVariables(String(config.replacement), context) : ''
        return { result: input.replace(new RegExp(param, 'g'), replacement) }
      }
      case 'trim': return { result: input.trim() }
      case 'uppercase': return { result: input.toUpperCase() }
      case 'lowercase': return { result: input.toLowerCase() }
      case 'length': return { result: input.length }
      case 'substring': {
        const start = Number(config.start || 0)
        const end = config.end ? Number(config.end) : undefined
        return { result: input.substring(start, end) }
      }
      case 'includes': return { result: input.includes(param) }
      case 'template': return { result: input } // Already resolved via resolveVariables
      default: return { result: input }
    }
  }

  private dateOperation(config: Record<string, unknown>, context: ExecutionContext): Record<string, unknown> {
    const op = config.dateOp as string || 'now'
    const input = config.input ? resolveVariables(String(config.input), context) : ''

    switch (op) {
      case 'now': return { result: new Date().toISOString() }
      case 'format': {
        const date = input ? new Date(input) : new Date()
        const format = (config.format as string) || 'iso'
        if (format === 'iso') return { result: date.toISOString() }
        if (format === 'date') return { result: date.toLocaleDateString() }
        if (format === 'time') return { result: date.toLocaleTimeString() }
        if (format === 'unix') return { result: Math.floor(date.getTime() / 1000) }
        return { result: date.toISOString() }
      }
      case 'add': {
        const date = input ? new Date(input) : new Date()
        const amount = Number(config.amount || 0)
        const unit = (config.unit as string) || 'days'
        switch (unit) {
          case 'seconds': date.setSeconds(date.getSeconds() + amount); break
          case 'minutes': date.setMinutes(date.getMinutes() + amount); break
          case 'hours': date.setHours(date.getHours() + amount); break
          case 'days': date.setDate(date.getDate() + amount); break
          case 'months': date.setMonth(date.getMonth() + amount); break
          case 'years': date.setFullYear(date.getFullYear() + amount); break
        }
        return { result: date.toISOString() }
      }
      case 'diff': {
        const date1 = new Date(input)
        const date2Str = config.date2 ? resolveVariables(String(config.date2), context) : ''
        const date2 = date2Str ? new Date(date2Str) : new Date()
        const diffMs = date2.getTime() - date1.getTime()
        return {
          result: {
            milliseconds: diffMs,
            seconds: Math.floor(diffMs / 1000),
            minutes: Math.floor(diffMs / 60000),
            hours: Math.floor(diffMs / 3600000),
            days: Math.floor(diffMs / 86400000),
          },
        }
      }
      case 'parse': {
        const date = new Date(input)
        return {
          result: {
            iso: date.toISOString(),
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate(),
            hour: date.getHours(),
            minute: date.getMinutes(),
            dayOfWeek: date.getDay(),
            timestamp: date.getTime(),
          },
        }
      }
      default: return { result: new Date().toISOString() }
    }
  }
}
