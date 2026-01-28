import { WorkflowNode } from '@/types'
import { ExecutionContext, NodeExecutionResult, NodeExecutor } from '../types'
import { resolveVariables } from '../variable-resolver'

export class UtilityExecutor implements NodeExecutor {
  type = 'utility'

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const start = Date.now()
    const config = node.data.config as Record<string, unknown>
    const utilityType = (config.utilityType as string) || node.data.label?.toLowerCase() || ''

    switch (utilityType) {
      case 'error':
      case 'error_handler':
        return this.handleError(config, context, start)
      case 'success':
        return this.handleSuccess(config, context, start)
      case 'fail':
        return this.handleFail(config, context, start)
      case 'log':
        return this.handleLog(config, context, start)
      default:
        return {
          success: true,
          output: { type: utilityType, timestamp: new Date().toISOString() },
          duration: Date.now() - start,
        }
    }
  }

  private async handleError(
    config: Record<string, unknown>,
    context: ExecutionContext,
    start: number
  ): Promise<NodeExecutionResult> {
    const fallbackValue = config.fallback as Record<string, unknown> || {}
    const retryCount = config.retryCount as number || 0
    const onError = config.onError as string || 'continue' // 'continue' | 'stop' | 'retry'

    return {
      success: true,
      output: {
        handled: true,
        strategy: onError,
        retryCount,
        fallback: fallbackValue,
        errorContext: context.nodeOutputs,
      },
      duration: Date.now() - start,
    }
  }

  private async handleSuccess(
    config: Record<string, unknown>,
    context: ExecutionContext,
    start: number
  ): Promise<NodeExecutionResult> {
    const message = config.message
      ? resolveVariables(String(config.message), context)
      : 'Workflow completed successfully'

    return {
      success: true,
      output: {
        status: 'success',
        message,
        completedAt: new Date().toISOString(),
        summary: context.nodeOutputs,
      },
      duration: Date.now() - start,
    }
  }

  private async handleFail(
    config: Record<string, unknown>,
    context: ExecutionContext,
    start: number
  ): Promise<NodeExecutionResult> {
    const message = config.message
      ? resolveVariables(String(config.message), context)
      : 'Workflow failed'

    return {
      success: false,
      output: {
        status: 'failed',
        message,
      },
      error: message,
      duration: Date.now() - start,
    }
  }

  private async handleLog(
    config: Record<string, unknown>,
    context: ExecutionContext,
    start: number
  ): Promise<NodeExecutionResult> {
    const message = config.message
      ? resolveVariables(String(config.message), context)
      : ''
    const level = (config.level as string) || 'info'
    const logData = config.data
      ? resolveVariables(String(config.data), context)
      : undefined

    console.log(`[Workflow ${context.workflowId}] [${level.toUpperCase()}] ${message}`, logData || '')

    return {
      success: true,
      output: {
        logged: true,
        level,
        message,
        data: logData,
        timestamp: new Date().toISOString(),
      },
      duration: Date.now() - start,
    }
  }
}

export class EndExecutor implements NodeExecutor {
  type = 'end'

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const start = Date.now()
    const config = node.data.config as Record<string, unknown>
    const outputMapping = config.output as Record<string, string> || {}

    // Collect final outputs based on mapping
    const finalOutput: Record<string, unknown> = {}
    for (const [key, path] of Object.entries(outputMapping)) {
      finalOutput[key] = resolveVariables(`{{${path}}}`, context)
    }

    return {
      success: true,
      output: {
        ...finalOutput,
        endedAt: new Date().toISOString(),
        totalNodes: context.nodeExecutionCount,
      },
      nextNodeIds: [], // No next nodes - this is the end
      duration: Date.now() - start,
    }
  }
}
