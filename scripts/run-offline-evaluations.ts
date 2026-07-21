import { readFileSync } from "node:fs"
import { z } from "zod"
import { governedRoleSchema } from "../src/lib/governed-ai/contracts"
import { retrieveDocuments } from "../src/lib/governed-ai/retrieval"
import { sha256 } from "../src/lib/governed-ai/security"

const datasetSchema = z.object({
  version: z.literal("grounded-template-recommendation-v1"),
  cases: z.array(z.object({
    name: z.string().min(1),
    query: z.string().min(1),
    role: governedRoleSchema,
    expectedDocumentId: z.string().uuid().nullable(),
    documents: z.array(z.object({
      id: z.string().uuid(),
      title: z.string().min(1),
      content: z.string().min(20),
      allowedRoles: z.array(governedRoleSchema).min(1),
    })).min(1),
  })).min(1),
})

const dataset = datasetSchema.parse(JSON.parse(readFileSync("evaluations/grounded-recommendation-v1.json", "utf8")))
const now = new Date("2026-07-20T00:00:00.000Z")
const failures = []
for (const evaluation of dataset.cases) {
  const documents = evaluation.documents.map((document) => ({
    ...document,
    contentHash: sha256(document.content),
    sourceUpdatedAt: now,
  }))
  const selected = retrieveDocuments(evaluation.query, documents, evaluation.role, 1)[0]?.id || null
  if (selected !== evaluation.expectedDocumentId) failures.push(`${evaluation.name}: expected ${evaluation.expectedDocumentId}, got ${selected}`)
}
if (failures.length) {
  console.error(failures.join("\n"))
  process.exit(1)
}
console.log(`Offline evaluation passed: ${dataset.cases.length} cases for ${dataset.version}.`)
