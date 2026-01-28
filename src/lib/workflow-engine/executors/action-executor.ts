import axios from 'axios'
import { WorkflowNode } from '@/types'
import { ExecutionContext, NodeExecutionResult, NodeExecutor } from '../types'
import { resolveObjectVariables } from '../variable-resolver'

export class ActionExecutor implements NodeExecutor {
  type = 'action'

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const start = Date.now()
    const config = resolveObjectVariables(
      node.data.config as Record<string, unknown>,
      context
    )
    const actionType = config.actionType as string

    try {
      let output: Record<string, unknown>

      switch (actionType) {
        case 'http_request':
          output = await this.executeHttpRequest(config)
          break
        case 'send_email':
          output = await this.executeSendEmail(config)
          break
        case 'create_record':
          output = await this.executeCreateRecord(config)
          break
        case 'update_record':
          output = await this.executeUpdateRecord(config)
          break
        case 'delete_record':
          output = await this.executeDeleteRecord(config)
          break
        case 'transform_data':
          output = await this.executeTransformData(config)
          break
        default:
          output = { result: 'action_completed', actionType, config }
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
        error: error instanceof Error ? error.message : 'Action execution failed',
        duration: Date.now() - start,
      }
    }
  }

  private async executeHttpRequest(config: Record<string, unknown>): Promise<Record<string, unknown>> {
    const method = (config.method as string || 'GET').toUpperCase()
    const url = config.url as string
    const headers = config.headers as Record<string, string> || {}
    const body = config.body as Record<string, unknown> | undefined

    if (!url) throw new Error('HTTP request requires a URL')

    const response = await axios({
      method,
      url,
      headers,
      data: body,
      timeout: 30000,
    })

    return {
      statusCode: response.status,
      headers: response.headers,
      body: response.data,
    }
  }

  private async executeSendEmail(config: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Email sending is a placeholder - would integrate with email service
    const to = config.to as string
    const subject = config.subject as string
    const body = config.body as string

    if (!to || !subject) throw new Error('Email requires "to" and "subject" fields')

    return {
      sent: true,
      to,
      subject,
      bodyLength: body?.length || 0,
      sentAt: new Date().toISOString(),
    }
  }

  private async executeCreateRecord(config: Record<string, unknown>): Promise<Record<string, unknown>> {
    const entity = config.entity as string
    const data = config.data as Record<string, unknown>

    if (!entity || !data) throw new Error('Create record requires "entity" and "data"')

    return {
      created: true,
      entity,
      data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
  }

  private async executeUpdateRecord(config: Record<string, unknown>): Promise<Record<string, unknown>> {
    const entity = config.entity as string
    const id = config.id as string
    const data = config.data as Record<string, unknown>

    if (!entity || !id || !data) throw new Error('Update record requires "entity", "id", and "data"')

    return {
      updated: true,
      entity,
      id,
      data,
      updatedAt: new Date().toISOString(),
    }
  }

  private async executeDeleteRecord(config: Record<string, unknown>): Promise<Record<string, unknown>> {
    const entity = config.entity as string
    const id = config.id as string

    if (!entity || !id) throw new Error('Delete record requires "entity" and "id"')

    return {
      deleted: true,
      entity,
      id,
      deletedAt: new Date().toISOString(),
    }
  }

  private async executeTransformData(config: Record<string, unknown>): Promise<Record<string, unknown>> {
    const input = config.input as unknown
    const transformations = config.transformations as Array<{ field: string; operation: string; value?: unknown }> || []

    let result: Record<string, unknown> = typeof input === 'object' && input !== null
      ? { ...(input as Record<string, unknown>) }
      : { value: input }

    for (const transform of transformations) {
      switch (transform.operation) {
        case 'set':
          result[transform.field] = transform.value
          break
        case 'delete':
          delete result[transform.field]
          break
        case 'rename':
          if (transform.value && typeof transform.value === 'string') {
            result[transform.value] = result[transform.field]
            delete result[transform.field]
          }
          break
        case 'uppercase':
          if (typeof result[transform.field] === 'string') {
            result[transform.field] = (result[transform.field] as string).toUpperCase()
          }
          break
        case 'lowercase':
          if (typeof result[transform.field] === 'string') {
            result[transform.field] = (result[transform.field] as string).toLowerCase()
          }
          break
      }
    }

    return { transformed: result }
  }
}
