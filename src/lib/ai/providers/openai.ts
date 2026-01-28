import axios from 'axios'
import { AIProviderConnector, AIRequest, AIResponse, AIModelId } from '../types'
import { getSystemPrompt } from '../prompts'

export class OpenAIConnector implements AIProviderConnector {
  provider = 'openai' as const
  models: AIModelId[] = ['gpt-4', 'gpt-3.5-turbo']

  async execute(request: AIRequest, apiKey: string, organization?: string): Promise<AIResponse> {
    const systemPrompt = getSystemPrompt(request.action, request.systemPrompt)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }

    if (organization) {
      headers['OpenAI-Organization'] = organization
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: request.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: request.input },
          ],
          temperature: request.parameters?.temperature ?? 0.7,
          max_tokens: request.parameters?.maxTokens ?? 2048,
          top_p: request.parameters?.topP ?? 1,
        },
        { headers, timeout: 60000 }
      )

      const choice = response.data.choices?.[0]
      const usage = response.data.usage

      return {
        success: true,
        output: choice?.message?.content || '',
        usage: usage ? {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        } : undefined,
        provider: 'openai',
        model: request.model,
      }
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error?.message || error.message
        : 'OpenAI API request failed'

      return {
        success: false,
        output: '',
        error: message,
        provider: 'openai',
        model: request.model,
      }
    }
  }
}
