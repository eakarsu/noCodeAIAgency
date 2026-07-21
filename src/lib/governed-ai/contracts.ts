import { z } from "zod"

export const governedRoleSchema = z.enum(["OWNER", "REVIEWER", "CONTRIBUTOR", "VIEWER"])
export type GovernedRoleName = z.infer<typeof governedRoleSchema>

export const sourceDocumentSchema = z.object({
  externalId: z.string().trim().min(1).max(160).regex(/^[A-Za-z0-9._:/-]+$/),
  title: z.string().trim().min(1).max(240),
  content: z.string().max(12_000).default(""),
  allowedRoles: z.array(governedRoleSchema).min(1).max(4),
  sourceUpdatedAt: z.string().datetime({ offset: true }),
  deleted: z.boolean().default(false),
}).superRefine((value, context) => {
  if (!value.deleted && value.content.trim().length < 20) {
    context.addIssue({ code: "custom", path: ["content"], message: "active documents need at least 20 characters" })
  }
})

export const sourceSyncSchema = z.object({
  agencyId: z.string().uuid(),
  cursor: z.string().trim().min(1).max(240),
  documents: z.array(sourceDocumentSchema).min(1).max(100),
})

export type SourceSyncInput = z.infer<typeof sourceSyncSchema>

export const createRecommendationSchema = z.object({
  query: z.string().trim().min(8).max(1_000),
})

export const decisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  note: z.string().trim().min(8).max(1_000),
})

export const providerOutputSchema = z.object({
  recommendedDocumentId: z.string().uuid(),
  title: z.string().trim().min(1).max(240),
  rationale: z.string().trim().min(20).max(2_000),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.object({
    documentId: z.string().uuid(),
    quote: z.string().trim().min(8).max(500),
  })).min(1).max(5),
})

export type ProviderOutput = z.infer<typeof providerOutputSchema>

export interface ProviderDocument {
  id: string
  title: string
  content: string
  contentHash: string
  sourceUpdatedAt: Date
}

export interface ProviderRequest {
  query: string
  documents: ProviderDocument[]
  promptVersion: string
}

export interface ProviderMetrics {
  provider: string
  model: string
  tokensIn: number
  tokensOut: number
  costMicros: number
  latencyMs: number
}

export interface ProviderResult {
  output: ProviderOutput
  metrics: ProviderMetrics
}

export interface RecommendationProvider {
  recommend(request: ProviderRequest): Promise<ProviderResult>
}
