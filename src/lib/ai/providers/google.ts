import axios from 'axios'
import { AIProviderConnector, AIRequest, AIResponse, AIModelId } from '../types'
import { getSystemPrompt } from '../prompts'

export class GoogleConnector implements AIProviderConnector {
  provider = 'google' as const
  models: AIModelId[] = ['gemini-pro']

  async execute(request: AIRequest, apiKey: string): Promise<AIResponse> {
    const systemPrompt = getSystemPrompt(request.action, request.systemPrompt)

    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
        {
          contents: [
            {
              parts: [
                { text: `${systemPrompt}\n\n${request.input}` },
              ],
            },
          ],
          generationConfig: {
            temperature: request.parameters?.temperature ?? 0.7,
            maxOutputTokens: request.parameters?.maxTokens ?? 2048,
            topP: request.parameters?.topP ?? 1,
          },
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 60000,
        }
      )

      const candidate = response.data.candidates?.[0]
      const content = candidate?.content?.parts?.[0]?.text || ''
      const usageMetadata = response.data.usageMetadata

      return {
        success: true,
        output: content,
        usage: usageMetadata ? {
          promptTokens: usageMetadata.promptTokenCount || 0,
          completionTokens: usageMetadata.candidatesTokenCount || 0,
          totalTokens: usageMetadata.totalTokenCount || 0,
        } : undefined,
        provider: 'google',
        model: request.model,
      }
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error?.message || error.message
        : 'Google AI API request failed'

      return {
        success: false,
        output: '',
        error: message,
        provider: 'google',
        model: request.model,
      }
    }
  }
}
