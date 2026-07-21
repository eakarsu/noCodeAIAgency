import type { GovernedRoleName, ProviderDocument } from "./contracts"

export interface SearchableDocument extends ProviderDocument {
  allowedRoles: GovernedRoleName[]
}

function terms(value: string): Set<string> {
  return new Set(
    value.toLowerCase().match(/[a-z0-9]{2,}/g)?.filter((term) => !STOP_WORDS.has(term)) || [],
  )
}

const STOP_WORDS = new Set(["and", "are", "for", "from", "how", "into", "that", "the", "this", "with", "you", "your"])

export function retrieveDocuments(
  query: string,
  documents: SearchableDocument[],
  role: GovernedRoleName,
  limit = 5,
): ProviderDocument[] {
  const queryTerms = terms(query)
  return documents
    .filter((document) => role === "OWNER" || document.allowedRoles.includes(role))
    .map((document) => {
      const titleTerms = terms(document.title)
      const contentTerms = terms(document.content)
      let score = 0
      for (const term of queryTerms) {
        if (titleTerms.has(term)) score += 4
        if (contentTerms.has(term)) score += 1
      }
      return { document, score }
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || right.document.sourceUpdatedAt.getTime() - left.document.sourceUpdatedAt.getTime() || left.document.id.localeCompare(right.document.id))
    .slice(0, limit)
    .map(({ document }) => ({
      id: document.id,
      title: document.title,
      content: document.content,
      contentHash: document.contentHash,
      sourceUpdatedAt: document.sourceUpdatedAt,
    }))
}
