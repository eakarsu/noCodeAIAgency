export type AIProvider = 'openai' | 'anthropic' | 'google' | 'openrouter'

export type AIModelId =
  | 'gpt-4'
  | 'gpt-3.5-turbo'
  | 'claude-3-opus'
  | 'claude-3-sonnet'
  | 'gemini-pro'

export type AIAction =
  | 'classify'
  | 'extract'
  | 'summarize'
  | 'sentiment'
  | 'generate'
  | 'transform'

export interface AIRequest {
  provider: AIProvider
  model: AIModelId
  action: AIAction
  input: string
  systemPrompt?: string
  parameters?: {
    temperature?: number
    maxTokens?: number
    topP?: number
  }
}

export interface AIResponse {
  success: boolean
  output: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  error?: string
  provider: AIProvider
  model: AIModelId
}

export interface AIProviderConnector {
  provider: AIProvider
  models: AIModelId[]
  execute(request: AIRequest, apiKey: string, organization?: string): Promise<AIResponse>
}

export interface AIModelInfo {
  id: AIModelId
  provider: AIProvider
  name: string
  maxTokens: number
  description: string
}

export const AI_MODELS: AIModelInfo[] = [
  { id: 'gpt-4', provider: 'openai', name: 'GPT-4', maxTokens: 8192, description: 'Most capable OpenAI model' },
  { id: 'gpt-3.5-turbo', provider: 'openai', name: 'GPT-3.5 Turbo', maxTokens: 4096, description: 'Fast and cost-effective' },
  { id: 'claude-3-opus', provider: 'anthropic', name: 'Claude 3 Opus', maxTokens: 4096, description: 'Most capable Anthropic model' },
  { id: 'claude-3-sonnet', provider: 'anthropic', name: 'Claude 3 Sonnet', maxTokens: 4096, description: 'Balanced performance and speed' },
  { id: 'gemini-pro', provider: 'google', name: 'Gemini Pro', maxTokens: 8192, description: 'Google multimodal model' },
  { id: 'gpt-4', provider: 'openrouter', name: 'GPT-4 (via OpenRouter)', maxTokens: 8192, description: 'OpenAI GPT-4 via OpenRouter' },
  { id: 'gpt-3.5-turbo', provider: 'openrouter', name: 'GPT-3.5 Turbo (via OpenRouter)', maxTokens: 4096, description: 'OpenAI GPT-3.5 via OpenRouter' },
  { id: 'claude-3-opus', provider: 'openrouter', name: 'Claude 3 Opus (via OpenRouter)', maxTokens: 4096, description: 'Anthropic Claude via OpenRouter' },
  { id: 'claude-3-sonnet', provider: 'openrouter', name: 'Claude 3 Sonnet (via OpenRouter)', maxTokens: 4096, description: 'Anthropic Claude via OpenRouter' },
  { id: 'gemini-pro', provider: 'openrouter', name: 'Gemini Pro (via OpenRouter)', maxTokens: 8192, description: 'Google Gemini via OpenRouter' },
]
