import axios from 'axios'
import { AIProviderConnector, AIRequest, AIResponse, AIModelId } from '../types'
import { getSystemPrompt } from '../prompts'

// OpenRouter model mapping - maps our internal IDs to OpenRouter model strings
const MODEL_MAP: Record<string, string> = {
  'gpt-4': 'openai/gpt-4',
  'gpt-3.5-turbo': 'openai/gpt-3.5-turbo',
  'claude-3-opus': 'anthropic/claude-3-opus',
  'claude-3-sonnet': 'anthropic/claude-3-sonnet',
  'gemini-pro': 'google/gemini-pro',
}

export class OpenRouterConnector implements AIProviderConnector {
  provider = 'openrouter' as const
  models: AIModelId[] = ['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet', 'gemini-pro']

  async execute(request: AIRequest, apiKey: string): Promise<AIResponse> {
    const systemPrompt = getSystemPrompt(request.action, request.systemPrompt)
    const model = MODEL_MAP[request.model] || request.model

    console.log('[OpenRouter] Connecting...')
    console.log('[OpenRouter] Model:', model)
    console.log('[OpenRouter] Action:', request.action)
    console.log('[OpenRouter] Input:', request.input.slice(0, 100) + (request.input.length > 100 ? '...' : ''))
    console.log('[OpenRouter] API Key:', apiKey?.slice(0, 10) + '...' + apiKey?.slice(-4))

    try {
      const startTime = Date.now()
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: request.input },
          ],
          temperature: request.parameters?.temperature ?? 0.7,
          max_tokens: request.parameters?.maxTokens ?? 2048,
          top_p: request.parameters?.topP ?? 1,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
            'X-Title': 'NoCodeAIAgency',
          },
          timeout: 60000,
        }
      )

      const duration = Date.now() - startTime
      const choice = response.data.choices?.[0]
      const usage = response.data.usage

      console.log('[OpenRouter] Success! Duration:', duration + 'ms')
      console.log('[OpenRouter] Response:', choice?.message?.content?.slice(0, 200))
      console.log('[OpenRouter] Tokens:', usage?.total_tokens || 'N/A')

      return {
        success: true,
        output: choice?.message?.content || '',
        usage: usage ? {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        } : undefined,
        provider: 'openrouter',
        model: request.model,
      }
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error?.message || error.message
        : 'OpenRouter API request failed'

      console.log('[OpenRouter] ERROR:', message)
      console.log('[OpenRouter] Status:', axios.isAxiosError(error) ? error.response?.status : 'unknown')
      console.log('[OpenRouter] Full error:', axios.isAxiosError(error) ? JSON.stringify(error.response?.data) : error)

      return {
        success: false,
        output: '',
        error: message,
        provider: 'openrouter',
        model: request.model,
      }
    }
  }
}
