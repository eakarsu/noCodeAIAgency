import { PrismaClient } from "@prisma/client"
import { verifyAuditChain } from "../src/lib/governed-ai/audit"

const prisma = new PrismaClient()

async function main() {
  const agencies = await prisma.agency.findMany({ select: { id: true } })
  for (const agency of agencies) {
    const result = await verifyAuditChain(prisma, agency.id)
    if (!result.valid) throw new Error(`Audit chain failed for tenant ${agency.id}.`)
  }
  console.log(`Verified audit chains for ${agencies.length} tenant(s).`)
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Audit verification failed."); process.exitCode = 1 }).finally(async () => prisma.$disconnect())
