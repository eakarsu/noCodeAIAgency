import type { Prisma, PrismaClient } from "@prisma/client"
import { canonicalJson, sha256 } from "./security"

type Database = PrismaClient | Prisma.TransactionClient

interface AuditInput {
  agencyId: string
  actorUserId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  payload: Prisma.InputJsonValue
}

function auditMaterial(input: AuditInput, sequence: number, previousHash: string, createdAt: Date): string {
  return canonicalJson({
    agencyId: input.agencyId,
    sequence,
    actorUserId: input.actorUserId || null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId || null,
    payload: input.payload,
    previousHash,
    createdAt: createdAt.toISOString(),
  })
}

export async function appendAudit(tx: Prisma.TransactionClient, input: AuditInput) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.agencyId}))`
  const previous = await tx.governedAuditEvent.findFirst({
    where: { agencyId: input.agencyId },
    orderBy: { sequence: "desc" },
  })
  const sequence = (previous?.sequence || 0) + 1
  const previousHash = previous?.hash || "GENESIS"
  const createdAt = new Date()
  const hash = sha256(auditMaterial(input, sequence, previousHash, createdAt))
  return tx.governedAuditEvent.create({
    data: { ...input, actorUserId: input.actorUserId || null, entityId: input.entityId || null, sequence, previousHash, hash, createdAt },
  })
}

export async function verifyAuditChain(database: Database, agencyId: string) {
  const events = await database.governedAuditEvent.findMany({ where: { agencyId }, orderBy: { sequence: "asc" } })
  let previousHash = "GENESIS"
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]
    const input: AuditInput = {
      agencyId: event.agencyId,
      actorUserId: event.actorUserId,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      payload: event.payload as Prisma.InputJsonValue,
    }
    const expected = sha256(auditMaterial(input, index + 1, previousHash, event.createdAt))
    if (event.sequence !== index + 1 || event.previousHash !== previousHash || event.hash !== expected) {
      return { valid: false, count: events.length, failedSequence: event.sequence }
    }
    previousHash = event.hash
  }
  return { valid: true, count: events.length, head: previousHash }
}
