import { prisma } from '@/lib/db'
import { AIProviderConnector, AIRequest, AIResponse, AIProvider, AI_MODELS } from './types'
import { OpenAIConnector } from './providers/openai'
import { AnthropicConnector } from './providers/anthropic'
import { GoogleConnector } from './providers/google'
import { OpenRouterConnector } from './providers/openrouter'
import { decryptCredentialsObject } from '@/lib/ai-helpers'

const connectors: Map<AIProvider, AIProviderConnector> = new Map()

function getConnector(provider: AIProvider): AIProviderConnector {
  if (connectors.size === 0) {
    connectors.set('openai', new OpenAIConnector())
    connectors.set('anthropic', new AnthropicConnector())
    connectors.set('google', new GoogleConnector())
    connectors.set('openrouter', new OpenRouterConnector())
  }

  const connector = connectors.get(provider)
  if (!connector) {
    throw new Error(`Unsupported AI provider: ${provider}`)
  }
  return connector
}

export class AIService {
  async execute(request: AIRequest, agencyId: string): Promise<AIResponse> {
    const connector = getConnector(request.provider)

    let apiKey: string | undefined
    let organization: string | undefined

    // For OpenRouter, use env variable directly
    if (request.provider === 'openrouter') {
      apiKey = process.env.OPENROUTER_API_KEY
      if (!apiKey) {
        return {
          success: false,
          output: '',
          error: 'OPENROUTER_API_KEY not configured in environment',
          provider: request.provider,
          model: request.model,
        }
      }
    } else {
      // Load API key from Integration model for other providers
      const integration = await prisma.integration.findFirst({
        where: {
          agencyId,
          type: 'AI_MODEL',
          provider: request.provider,
          status: 'ACTIVE',
        },
      })

      if (!integration) {
        return {
          success: false,
          output: '',
          error: `No active ${request.provider} integration found for this agency. Consider using 'openrouter' provider instead.`,
          provider: request.provider,
          model: request.model,
        }
      }

      const credentials = decryptCredentialsObject(integration.credentials as Record<string, unknown>) as Record<string, string>
      apiKey = credentials.apiKey
      organization = credentials.organization

      if (!apiKey) {
        return {
          success: false,
          output: '',
          error: `API key not configured for ${request.provider} integration`,
          provider: request.provider,
          model: request.model,
        }
      }
    }

    const response = await connector.execute(request, apiKey, organization)

    // Track usage if successful
    if (response.success && response.usage) {
      try {
        // Find a client for the agency to record usage against
        const client = await prisma.client.findFirst({
          where: { agencyId },
        })

        if (client) {
          await prisma.usageRecord.create({
            data: {
              clientId: client.id,
              metric: `ai_tokens_${request.provider}_${request.model}`,
              value: response.usage.totalTokens,
            },
          })
        }
      } catch {
        // Usage tracking failure shouldn't break the response
      }
    }

    return response
  }

  getAvailableModels(provider?: AIProvider) {
    if (provider) {
      return AI_MODELS.filter(m => m.provider === provider)
    }
    return AI_MODELS
  }

  async getConfiguredProviders(agencyId: string): Promise<AIProvider[]> {
    const providers: AIProvider[] = []

    // OpenRouter is configured via env variable
    if (process.env.OPENROUTER_API_KEY) {
      providers.push('openrouter')
    }

    // Other providers configured via Integration model
    const integrations = await prisma.integration.findMany({
      where: {
        agencyId,
        type: 'AI_MODEL',
        status: 'ACTIVE',
      },
      select: { provider: true },
    })

    for (const i of integrations) {
      providers.push(i.provider as AIProvider)
    }

    return providers
  }
}
