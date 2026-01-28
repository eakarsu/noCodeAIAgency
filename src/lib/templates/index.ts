import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import leadQualification from './lead-qualification.json'
import customerOnboarding from './customer-onboarding.json'
import supportTicketRouting from './support-ticket-routing.json'
import contentGeneration from './content-generation.json'
import ecommerceOrder from './ecommerce-order.json'

export interface BuiltInTemplate {
  name: string
  description: string
  type: string
  category: string
  industry?: string
  tags: string[]
  nodes: unknown[]
  edges: unknown[]
  variables: Record<string, unknown>
}

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  leadQualification as BuiltInTemplate,
  customerOnboarding as BuiltInTemplate,
  supportTicketRouting as BuiltInTemplate,
  contentGeneration as BuiltInTemplate,
  ecommerceOrder as BuiltInTemplate,
]

export async function seedBuiltInTemplates(): Promise<number> {
  let seeded = 0

  for (const template of BUILT_IN_TEMPLATES) {
    const existing = await prisma.template.findFirst({
      where: { name: template.name, isBuiltIn: true },
    })

    if (!existing) {
      await prisma.template.create({
        data: {
          name: template.name,
          description: template.description,
          type: template.type as 'WORKFLOW',
          category: template.category,
          industry: template.industry,
          tags: template.tags,
          content: {
            nodes: template.nodes,
            edges: template.edges,
            variables: template.variables,
          } as unknown as Prisma.InputJsonValue,
          isPublic: true,
          isBuiltIn: true,
          version: '1.0.0',
        },
      })
      seeded++
    }
  }

  return seeded
}
