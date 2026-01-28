import { ExecutionContext } from './types'

const VARIABLE_PATTERN = /\{\{([\w.]+)\}\}/g

export function resolveVariables(template: string, context: ExecutionContext): string {
  return template.replace(VARIABLE_PATTERN, (match, path: string) => {
    const value = resolvePathValue(path, context)
    if (value === undefined) return match
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  })
}

export function resolveObjectVariables(
  obj: Record<string, unknown>,
  context: ExecutionContext
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      resolved[key] = resolveVariables(value, context)
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      resolved[key] = resolveObjectVariables(value as Record<string, unknown>, context)
    } else if (Array.isArray(value)) {
      resolved[key] = value.map(item => {
        if (typeof item === 'string') return resolveVariables(item, context)
        if (typeof item === 'object' && item !== null) {
          return resolveObjectVariables(item as Record<string, unknown>, context)
        }
        return item
      })
    } else {
      resolved[key] = value
    }
  }
  return resolved
}

function resolvePathValue(path: string, context: ExecutionContext): unknown {
  const parts = path.split('.')

  // Handle nodes.nodeId.output.field pattern
  if (parts[0] === 'nodes' && parts.length >= 3) {
    const nodeId = parts[1]
    const nodeOutput = context.nodeOutputs[nodeId]
    if (!nodeOutput || typeof nodeOutput !== 'object') return undefined
    return getNestedValue(nodeOutput as Record<string, unknown>, parts.slice(2))
  }

  // Handle variables.field pattern
  if (parts[0] === 'variables') {
    return getNestedValue(context.variables, parts.slice(1))
  }

  // Handle trigger.field pattern
  if (parts[0] === 'trigger') {
    return getNestedValue(context.triggerData, parts.slice(1))
  }

  return undefined
}

function getNestedValue(obj: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = obj
  for (const key of path) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[key]
  }
  return current
}
