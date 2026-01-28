import { WorkflowNode } from '@/types'
import { ExecutionContext, NodeExecutionResult, NodeExecutor } from '../types'

export class DelayExecutor implements NodeExecutor {
  type = 'delay'

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const start = Date.now()
    const config = node.data.config as Record<string, unknown>
    const delayMs = this.calculateDelayMs(config)
    const maxDelayMs = 60000 // Max 60 seconds for sync mode

    try {
      if (context.executionMode === 'sync') {
        // In sync mode, sleep (capped at maxDelayMs)
        const actualDelay = Math.min(delayMs, maxDelayMs)
        await this.sleep(actualDelay)

        return {
          success: true,
          output: {
            delayed: true,
            requestedMs: delayMs,
            actualMs: actualDelay,
            mode: 'sync',
            capped: delayMs > maxDelayMs,
          },
          duration: Date.now() - start,
        }
      } else {
        // In async mode, record the delay requirement
        // The engine will handle scheduling the resume
        return {
          success: true,
          output: {
            delayed: true,
            requestedMs: delayMs,
            mode: 'async',
            resumeAt: new Date(Date.now() + delayMs).toISOString(),
          },
          duration: Date.now() - start,
        }
      }
    } catch (error) {
      return {
        success: false,
        output: {},
        error: error instanceof Error ? error.message : 'Delay execution failed',
        duration: Date.now() - start,
      }
    }
  }

  private calculateDelayMs(config: Record<string, unknown>): number {
    const value = Number(config.value || 0)
    const unit = (config.unit as string) || 'seconds'

    switch (unit) {
      case 'milliseconds':
        return value
      case 'seconds':
        return value * 1000
      case 'minutes':
        return value * 60 * 1000
      case 'hours':
        return value * 60 * 60 * 1000
      default:
        return value * 1000
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
