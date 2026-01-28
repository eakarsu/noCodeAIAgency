import axios from 'axios'
import { AIProviderConnector, AIRequest, AIResponse, AIModelId } from '../types'
import { getSystemPrompt } from '../prompts'

const MODEL_MAP: Record<string, string> = {
  'claude-3-opus': 'claude-3-opus-20240229',
  'claude-3-sonnet': 'claude-3-sonnet-20240229',
}

export class AnthropicConnector implements AIProviderConnector {
  provider = 'anthropic' as const
  models: AIModelId[] = ['claude-3-opus', 'claude-3-sonnet']

  async execute(request: AIRequest, apiKey: string): Promise<AIResponse> {
    const systemPrompt = getSystemPrompt(request.action, request.systemPrompt)
    const modelId = MODEL_MAP[request.model] || request.model

    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: modelId,
          max_tokens: request.parameters?.maxTokens ?? 2048,
          system: systemPrompt,
          messages: [
            { role: 'user', content: request.input },
          ],
          temperature: request.parameters?.temperature ?? 0.7,
          top_p: request.parameters?.topP ?? 1,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          timeout: 60000,
        }
      )

      const content = response.data.content?.[0]
      const usage = response.data.usage

      return {
        success: true,
        output: content?.text || '',
        usage: usage ? {
          promptTokens: usage.input_tokens,
          completionTokens: usage.output_tokens,
          totalTokens: usage.input_tokens + usage.output_tokens,
        } : undefined,
        provider: 'anthropic',
        model: request.model,
      }
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error?.message || error.message
        : 'Anthropic API request failed'

      return {
        success: false,
        output: '',
        error: message,
        provider: 'anthropic',
        model: request.model,
      }
    }
  }
}
