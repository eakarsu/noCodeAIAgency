import { WorkflowNode } from '@/types'
import { ExecutionContext, NodeExecutionResult, NodeExecutor } from '../types'

export class WaitExecutor implements NodeExecutor {
  type = 'wait'

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const start = Date.now()
    const config = node.data.config as Record<string, unknown>
    const waitType = (config.waitType as string) || 'event'
    const timeoutMs = ((config.timeout as number) || 3600) * 1000 // default 1 hour

    switch (waitType) {
      case 'event':
        return this.waitForEvent(config, context, start, timeoutMs)
      case 'approval':
        return this.waitForApproval(config, context, start)
      case 'webhook_response':
        return this.waitForWebhook(config, context, start)
      default:
        return {
          success: true,
          output: {
            waitType,
            status: 'waiting',
            startedAt: new Date().toISOString(),
          },
          duration: Date.now() - start,
        }
    }
  }

  private async waitForEvent(
    config: Record<string, unknown>,
    context: ExecutionContext,
    start: number,
    _timeoutMs: number
  ): Promise<NodeExecutionResult> {
    const eventName = config.event as string || ''

    // In async mode, record that we're waiting and let the engine handle resume
    if (context.executionMode === 'async') {
      return {
        success: true,
        output: {
          status: 'waiting',
          waitType: 'event',
          event: eventName,
          instanceId: context.instanceId,
          startedWaitingAt: new Date().toISOString(),
        },
        duration: Date.now() - start,
      }
    }

    // In sync mode, we can't truly wait - just pass through
    return {
      success: true,
      output: {
        status: 'skipped',
        waitType: 'event',
        event: eventName,
        reason: 'Sync mode cannot wait for events',
      },
      duration: Date.now() - start,
    }
  }

  private async waitForApproval(
    config: Record<string, unknown>,
    context: ExecutionContext,
    start: number
  ): Promise<NodeExecutionResult> {
    const approvers = config.approvers as string[] || []
    const message = config.message as string || 'Approval required'

    return {
      success: true,
      output: {
        status: 'pending_approval',
        waitType: 'approval',
        approvers,
        message,
        instanceId: context.instanceId,
        requestedAt: new Date().toISOString(),
      },
      duration: Date.now() - start,
    }
  }

  private async waitForWebhook(
    config: Record<string, unknown>,
    context: ExecutionContext,
    start: number
  ): Promise<NodeExecutionResult> {
    const responseSchema = config.responseSchema as Record<string, unknown> || {}

    return {
      success: true,
      output: {
        status: 'waiting_webhook',
        waitType: 'webhook_response',
        instanceId: context.instanceId,
        expectedSchema: responseSchema,
        callbackUrl: `/api/workflows/instances/${context.instanceId}/resume`,
        startedWaitingAt: new Date().toISOString(),
      },
      duration: Date.now() - start,
    }
  }
}
