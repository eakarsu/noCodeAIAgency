import { WorkflowNode } from '@/types'
import { ExecutionContext, NodeExecutionResult, NodeExecutor } from '../types'
import { resolveVariables } from '../variable-resolver'

export class AIExecutor implements NodeExecutor {
  type = 'ai'

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const start = Date.now()
    const config = node.data.config as Record<string, unknown>

    const provider = config.provider as string || 'openrouter'
    const model = config.model as string || 'gpt-3.5-turbo'
    const action = config.action as string || 'generate'
    const inputTemplate = config.input as string || ''
    const systemPrompt = config.systemPrompt as string || ''

    try {
      const resolvedInput = resolveVariables(inputTemplate, context)
      const resolvedSystemPrompt = systemPrompt ? resolveVariables(systemPrompt, context) : undefined

      // Delegate to AIService - dynamic import to avoid circular deps
      const { AIService } = await import('@/lib/ai/service')
      const aiService = new AIService()

      const agencyId = config.agencyId as string || ''
      const response = await aiService.execute({
        provider: provider as 'openai' | 'anthropic' | 'google' | 'openrouter',
        model: model as 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3-opus' | 'claude-3-sonnet' | 'gemini-pro',
        action: action as 'classify' | 'extract' | 'summarize' | 'sentiment' | 'generate' | 'transform',
        input: resolvedInput,
        systemPrompt: resolvedSystemPrompt,
        parameters: config.parameters as Record<string, number> | undefined,
      }, agencyId)

      return {
        success: response.success,
        output: {
          result: response.output,
          provider: response.provider,
          model: response.model,
          usage: response.usage,
        },
        error: response.error,
        duration: Date.now() - start,
      }
    } catch (error) {
      return {
        success: false,
        output: {},
        error: error instanceof Error ? error.message : 'AI execution failed',
        duration: Date.now() - start,
      }
    }
  }
}
