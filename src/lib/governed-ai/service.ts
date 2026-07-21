import type { GovernedRecommendationJob, Prisma, PrismaClient } from "@prisma/client"
import type { GovernedActor } from "./authz"
import { requireRole } from "./authz"
import type { RecommendationProvider, SourceSyncInput } from "./contracts"
import type { VerifiedSync } from "./security"
import { canonicalJson, sha256 } from "./security"
import { GovernedError } from "./errors"
import { appendAudit } from "./audit"
import { retrieveDocuments } from "./retrieval"

const PROMPT_VERSION = "grounded-template-recommendation-v1"

function positiveInteger(name: string, fallback: number): number {
  const value = Number(process.env[name] || fallback)
  if (!Number.isSafeInteger(value) || value < 1) throw new GovernedError("CONFIG_INVALID", `${name} must be a positive integer.`, 503)
  return value
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

export async function syncDocuments(prisma: PrismaClient, verified: VerifiedSync) {
  const existingReceipt = await prisma.governedSyncReceipt.findUnique({
    where: { agencyId_providerEventId: { agencyId: verified.input.agencyId, providerEventId: verified.eventId } },
  })
  if (existingReceipt) {
    if (existingReceipt.requestHash !== verified.requestHash) {
      throw new GovernedError("SYNC_IDEMPOTENCY_CONFLICT", "The provider event ID was already used for a different payload.", 409)
    }
    return { replayed: true, outcome: existingReceipt.outcome }
  }

  return prisma.$transaction(async (tx) => {
    const replay = await tx.governedSyncReceipt.findUnique({
      where: { agencyId_providerEventId: { agencyId: verified.input.agencyId, providerEventId: verified.eventId } },
    })
    if (replay) {
      if (replay.requestHash !== verified.requestHash) throw new GovernedError("SYNC_IDEMPOTENCY_CONFLICT", "The provider event ID was already used for a different payload.", 409)
      return { replayed: true, outcome: replay.outcome }
    }

    const agency = await tx.agency.findUnique({ where: { id: verified.input.agencyId }, select: { id: true } })
    if (!agency) throw new GovernedError("SYNC_TENANT_UNKNOWN", "The source tenant does not exist.", 404)
    const outcome = { cursor: verified.input.cursor, created: 0, updated: 0, deleted: 0, unchanged: 0 }

    for (const document of verified.input.documents) {
      const current = await tx.governedSourceDocument.findUnique({
        where: { agencyId_externalId: { agencyId: verified.input.agencyId, externalId: document.externalId } },
      })
      const sourceUpdatedAt = new Date(document.sourceUpdatedAt)
      const content = document.deleted ? "" : document.content.trim()
      const contentHash = sha256(content)
      if (current && current.sourceUpdatedAt.getTime() > sourceUpdatedAt.getTime()) {
        throw new GovernedError("OUT_OF_ORDER_SOURCE_UPDATE", `Document ${document.externalId} has a newer recorded source timestamp.`, 409)
      }
      if (current && current.sourceUpdatedAt.getTime() === sourceUpdatedAt.getTime()) {
        const same = current.contentHash === contentHash && Boolean(current.deletedAt) === document.deleted
        if (!same) throw new GovernedError("SOURCE_VERSION_CONFLICT", `Document ${document.externalId} changed without a newer source timestamp.`, 409)
        outcome.unchanged += 1
        continue
      }
      const data = {
        title: document.title,
        content,
        contentHash,
        allowedRoles: [...new Set(document.allowedRoles)],
        sourceUpdatedAt,
        syncedAt: new Date(),
        deletedAt: document.deleted ? new Date() : null,
      }
      if (current) {
        await tx.governedSourceDocument.update({ where: { id: current.id }, data: { ...data, version: { increment: 1 } } })
        if (document.deleted) outcome.deleted += 1
        else outcome.updated += 1
      } else {
        await tx.governedSourceDocument.create({
          data: { agencyId: verified.input.agencyId, externalId: document.externalId, ...data },
        })
        if (document.deleted) outcome.deleted += 1
        else outcome.created += 1
      }
    }

    await tx.governedSyncReceipt.create({
      data: {
        agencyId: verified.input.agencyId,
        providerEventId: verified.eventId,
        keyId: verified.keyId,
        requestHash: verified.requestHash,
        sourceTimestamp: verified.sourceTimestamp,
        outcome,
      },
    })
    await appendAudit(tx, {
      agencyId: verified.input.agencyId,
      action: "SOURCE_SYNCED",
      entityType: "SOURCE_SYNC_RECEIPT",
      entityId: verified.eventId,
      payload: asJson({ requestHash: verified.requestHash, keyId: verified.keyId, ...outcome }),
    })
    return { replayed: false, outcome }
  }, { isolationLevel: "Serializable" })
}

function minuteWindow(now: Date): Date {
  return new Date(Math.floor(now.getTime() / 60_000) * 60_000)
}

export async function createRecommendationJob(
  prisma: PrismaClient,
  actor: GovernedActor,
  query: string,
  idempotencyKey: string,
  now = new Date(),
) {
  requireRole(actor, "CONTRIBUTOR")
  if (!/^[A-Za-z0-9._:-]{8,160}$/.test(idempotencyKey)) {
    throw new GovernedError("IDEMPOTENCY_KEY_INVALID", "A valid idempotency key is required.", 400)
  }
  const inputHash = sha256(canonicalJson({ query }))
  const existing = await prisma.governedRecommendationJob.findUnique({
    where: { agencyId_idempotencyKey: { agencyId: actor.agencyId, idempotencyKey } },
  })
  if (existing) {
    if (existing.inputHash !== inputHash) throw new GovernedError("IDEMPOTENCY_CONFLICT", "The idempotency key was already used for different input.", 409)
    return { replayed: true, job: existing }
  }

  const rate = await prisma.governedRateWindow.upsert({
    where: { agencyId_userId_windowStart: { agencyId: actor.agencyId, userId: actor.userId, windowStart: minuteWindow(now) } },
    create: { agencyId: actor.agencyId, userId: actor.userId, windowStart: minuteWindow(now), count: 1 },
    update: { count: { increment: 1 } },
  })
  if (rate.count > positiveInteger("GOVERNED_JOBS_PER_MINUTE", 10)) {
    throw new GovernedError("RATE_LIMITED", "The governed recommendation rate limit was exceeded.", 429)
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const job = await tx.governedRecommendationJob.create({
        data: {
          agencyId: actor.agencyId,
          createdByUserId: actor.userId,
          roleAtCreation: actor.role,
          idempotencyKey,
          inputHash,
          query,
          maxAttempts: positiveInteger("GOVERNED_MAX_ATTEMPTS", 3),
        },
      })
      await appendAudit(tx, {
        agencyId: actor.agencyId,
        actorUserId: actor.userId,
        action: "RECOMMENDATION_QUEUED",
        entityType: "RECOMMENDATION_JOB",
        entityId: job.id,
        payload: asJson({ inputHash, role: actor.role, idempotencyKeyHash: sha256(idempotencyKey) }),
      })
      return { replayed: false, job }
    }, { isolationLevel: "Serializable" })
  } catch (error) {
    const raced = await prisma.governedRecommendationJob.findUnique({
      where: { agencyId_idempotencyKey: { agencyId: actor.agencyId, idempotencyKey } },
    })
    if (raced?.inputHash === inputHash) return { replayed: true, job: raced }
    throw error
  }
}

async function claimJob(prisma: PrismaClient, leaseOwner: string, now: Date): Promise<GovernedRecommendationJob | null> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = await prisma.governedRecommendationJob.findFirst({
      where: {
        OR: [
          { status: "PENDING", scheduledFor: { lte: now } },
          { status: "RUNNING", leaseExpiresAt: { lt: now } },
        ],
      },
      orderBy: [{ scheduledFor: "asc" }, { createdAt: "asc" }],
    })
    if (!candidate) return null
    const updated = await prisma.governedRecommendationJob.updateMany({
      where: {
        id: candidate.id,
        OR: [
          { status: "PENDING", scheduledFor: { lte: now } },
          { status: "RUNNING", leaseExpiresAt: { lt: now } },
        ],
      },
      data: {
        status: "RUNNING",
        leaseOwner,
        leaseExpiresAt: new Date(now.getTime() + positiveInteger("GOVERNED_LEASE_MS", 30_000)),
        attemptCount: { increment: 1 },
        errorCode: null,
        errorMessage: null,
      },
    })
    if (updated.count === 1) return prisma.governedRecommendationJob.findUnique({ where: { id: candidate.id } })
  }
  return null
}

function validateProviderResult(
  job: GovernedRecommendationJob,
  documents: Array<{ id: string; content: string }>,
  result: Awaited<ReturnType<RecommendationProvider["recommend"]>>,
) {
  const documentById = new Map(documents.map((document) => [document.id, document]))
  const recommendedKnown = documentById.has(result.output.recommendedDocumentId)
  const evidenceValid = result.output.evidence.every((item) => {
    const source = documentById.get(item.documentId)
    return Boolean(source && source.content.includes(item.quote))
  })
  const confidenceThreshold = Number(process.env.GOVERNED_MIN_CONFIDENCE || 0.65)
  if (!Number.isFinite(confidenceThreshold) || confidenceThreshold < 0 || confidenceThreshold > 1) {
    throw new GovernedError("CONFIG_INVALID", "GOVERNED_MIN_CONFIDENCE must be between zero and one.", 503)
  }
  const withinCost = result.metrics.costMicros <= positiveInteger("GOVERNED_MAX_COST_MICROS", 100_000)
  const withinLatency = result.metrics.latencyMs <= positiveInteger("GOVERNED_MAX_LATENCY_MS", 10_000)
  const quality = {
    passed: recommendedKnown && evidenceValid && result.output.confidence >= confidenceThreshold && withinCost && withinLatency,
    recommendedKnown,
    evidenceValid,
    confidenceThreshold,
    confidence: result.output.confidence,
    withinCost,
    withinLatency,
    promptVersion: PROMPT_VERSION,
    inputHash: job.inputHash,
  }
  if (!quality.passed) throw new GovernedError("QUALITY_GATE_FAILED", "The recommendation failed deterministic evidence or budget gates.", 422)
  return quality
}

async function finishFailure(prisma: PrismaClient, job: GovernedRecommendationJob, leaseOwner: string, error: unknown, now: Date) {
  const governed = error instanceof GovernedError ? error : new GovernedError("PROVIDER_SCHEMA_ERROR", "The provider output could not be validated.", 502, true)
  const retry = governed.retryable && job.attemptCount < job.maxAttempts
  await prisma.$transaction(async (tx) => {
    const updated = await tx.governedRecommendationJob.updateMany({
      where: { id: job.id, status: "RUNNING", leaseOwner },
      data: retry ? {
        status: "PENDING",
        scheduledFor: new Date(now.getTime() + Math.min(60_000, 1_000 * 2 ** job.attemptCount)),
        leaseOwner: null,
        leaseExpiresAt: null,
        errorCode: governed.code,
        errorMessage: governed.message.slice(0, 500),
      } : {
        status: "FAILED",
        completedAt: now,
        leaseOwner: null,
        leaseExpiresAt: null,
        errorCode: governed.code,
        errorMessage: governed.message.slice(0, 500),
      },
    })
    if (updated.count === 1) {
      await appendAudit(tx, {
        agencyId: job.agencyId,
        action: retry ? "RECOMMENDATION_RETRY_SCHEDULED" : "RECOMMENDATION_FAILED",
        entityType: "RECOMMENDATION_JOB",
        entityId: job.id,
        payload: asJson({ code: governed.code, attemptCount: job.attemptCount, retry }),
      })
    }
  })
}

export async function processNextRecommendation(
  prisma: PrismaClient,
  provider: RecommendationProvider,
  leaseOwner: string,
  now = new Date(),
) {
  if (!/^[A-Za-z0-9._:-]{3,160}$/.test(leaseOwner)) throw new GovernedError("WORKER_ID_INVALID", "The worker ID is invalid.", 500)
  const job = await claimJob(prisma, leaseOwner, now)
  if (!job) return null
  try {
    const freshnessCutoff = new Date(now.getTime() - positiveInteger("GOVERNED_SOURCE_MAX_AGE_SECONDS", 86_400) * 1_000)
    const sourceDocuments = await prisma.governedSourceDocument.findMany({
      where: {
        agencyId: job.agencyId,
        deletedAt: null,
        sourceUpdatedAt: { gte: freshnessCutoff },
      },
      orderBy: { sourceUpdatedAt: "desc" },
      take: 200,
    })
    const documents = retrieveDocuments(job.query, sourceDocuments, job.roleAtCreation, 5)
    if (!documents.length) throw new GovernedError("NO_FRESH_EVIDENCE", "No fresh, permission-eligible evidence matched the request.", 422, true)
    const result = await provider.recommend({ query: job.query, documents, promptVersion: PROMPT_VERSION })
    const quality = validateProviderResult(job, documents, result)
    const output = asJson(result.output)
    await prisma.$transaction(async (tx) => {
      const updated = await tx.governedRecommendationJob.updateMany({
        where: { id: job.id, status: "RUNNING", leaseOwner },
        data: {
          status: "AWAITING_APPROVAL",
          retrievedDocumentIds: documents.map((document) => document.id),
          evidence: asJson(result.output.evidence),
          output,
          quality: asJson(quality),
          provider: result.metrics.provider,
          model: result.metrics.model,
          promptVersion: PROMPT_VERSION,
          tokensIn: result.metrics.tokensIn,
          tokensOut: result.metrics.tokensOut,
          costMicros: result.metrics.costMicros,
          latencyMs: result.metrics.latencyMs,
          completedAt: now,
          leaseOwner: null,
          leaseExpiresAt: null,
        },
      })
      if (updated.count !== 1) throw new GovernedError("JOB_LEASE_LOST", "The recommendation job lease was lost.", 409, true)
      await appendAudit(tx, {
        agencyId: job.agencyId,
        action: "RECOMMENDATION_AWAITING_APPROVAL",
        entityType: "RECOMMENDATION_JOB",
        entityId: job.id,
        payload: asJson({
          documentIds: documents.map((document) => document.id),
          documentHashes: documents.map((document) => document.contentHash),
          provider: result.metrics.provider,
          model: result.metrics.model,
          promptVersion: PROMPT_VERSION,
          quality,
          tokensIn: result.metrics.tokensIn,
          tokensOut: result.metrics.tokensOut,
          costMicros: result.metrics.costMicros,
          latencyMs: result.metrics.latencyMs,
        }),
      })
    })
    return prisma.governedRecommendationJob.findUnique({ where: { id: job.id } })
  } catch (error) {
    await finishFailure(prisma, job, leaseOwner, error, now)
    return prisma.governedRecommendationJob.findUnique({ where: { id: job.id } })
  }
}

export async function decideRecommendation(
  prisma: PrismaClient,
  actor: GovernedActor,
  jobId: string,
  decision: "APPROVE" | "REJECT",
  note: string,
  now = new Date(),
) {
  requireRole(actor, "REVIEWER")
  return prisma.$transaction(async (tx) => {
    const job = await tx.governedRecommendationJob.findFirst({ where: { id: jobId, agencyId: actor.agencyId } })
    if (!job) throw new GovernedError("JOB_NOT_FOUND", "The recommendation job was not found.", 404)
    if (job.status !== "AWAITING_APPROVAL") throw new GovernedError("JOB_NOT_DECIDABLE", "Only recommendations awaiting approval can be decided.", 409)
    const status = decision === "APPROVE" ? "APPROVED" : "REJECTED"
    const updated = await tx.governedRecommendationJob.update({
      where: { id: job.id },
      data: { status, decidedByUserId: actor.userId, decisionNote: note, decidedAt: now },
    })
    await appendAudit(tx, {
      agencyId: actor.agencyId,
      actorUserId: actor.userId,
      action: decision === "APPROVE" ? "RECOMMENDATION_APPROVED" : "RECOMMENDATION_REJECTED",
      entityType: "RECOMMENDATION_JOB",
      entityId: job.id,
      payload: asJson({ noteHash: sha256(note), priorStatus: job.status }),
    })
    return updated
  }, { isolationLevel: "Serializable" })
}

export async function listSourceDocuments(prisma: PrismaClient, actor: GovernedActor) {
  return prisma.governedSourceDocument.findMany({
    where: {
      agencyId: actor.agencyId,
      ...(actor.role === "OWNER" ? {} : { allowedRoles: { has: actor.role } }),
    },
    select: {
      id: true,
      externalId: true,
      title: true,
      allowedRoles: true,
      sourceUpdatedAt: true,
      syncedAt: true,
      deletedAt: true,
      version: true,
      contentHash: true,
    },
    orderBy: { sourceUpdatedAt: "desc" },
    take: 200,
  })
}

export async function listRecommendationJobs(prisma: PrismaClient, actor: GovernedActor) {
  requireRole(actor, "CONTRIBUTOR")
  return prisma.governedRecommendationJob.findMany({
    where: {
      agencyId: actor.agencyId,
      ...(actor.role === "CONTRIBUTOR" ? { createdByUserId: actor.userId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })
}

export type { SourceSyncInput }
