import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import test from "node:test"
import { PrismaClient } from "@prisma/client"
import type { GovernedActor } from "../src/lib/governed-ai/authz"
import type { ProviderRequest, ProviderResult, RecommendationProvider } from "../src/lib/governed-ai/contracts"
import { verifyAuditChain } from "../src/lib/governed-ai/audit"
import { GovernedError } from "../src/lib/governed-ai/errors"
import { createRecommendationJob, decideRecommendation, listSourceDocuments, processNextRecommendation, syncDocuments } from "../src/lib/governed-ai/service"
import { sha256, type VerifiedSync } from "../src/lib/governed-ai/security"

const enabled = process.env.RUN_DB_TESTS === "1" && Boolean(process.env.DATABASE_URL)

class DeterministicProvider implements RecommendationProvider {
  constructor(private readonly mode: "valid" | "bad-evidence" | "retry" = "valid") {}

  async recommend(request: ProviderRequest): Promise<ProviderResult> {
    if (this.mode === "retry") throw new GovernedError("TEST_PROVIDER_UNAVAILABLE", "Injected provider failure.", 502, true)
    const selected = request.documents[0]
    const quote = this.mode === "bad-evidence" ? "This quote is not present in the source." : selected.content.slice(0, 60)
    return {
      output: {
        recommendedDocumentId: selected.id,
        title: selected.title,
        rationale: "This recommendation is grounded in the permission-eligible source and requires human approval.",
        confidence: 0.9,
        evidence: [{ documentId: selected.id, quote }],
      },
      metrics: { provider: "deterministic-test", model: "fixture-v1", tokensIn: 100, tokensOut: 40, costMicros: 50, latencyMs: 20 },
    }
  }
}

function verifiedSync(agencyId: string, eventId: string, documents: VerifiedSync["input"]["documents"], timestamp = new Date()): VerifiedSync {
  const input = { agencyId, cursor: `cursor-${eventId}`, documents }
  return { input, eventId, keyId: "integration-key", requestHash: sha256(JSON.stringify(input)), sourceTimestamp: timestamp }
}

test("governed recommendation persists tenant boundaries, sync semantics, gates, retries, decisions, and immutable audit", { skip: !enabled }, async () => {
  process.env.GOVERNED_JOBS_PER_MINUTE = "20"
  process.env.GOVERNED_MAX_ATTEMPTS = "3"
  process.env.GOVERNED_LEASE_MS = "30000"
  process.env.GOVERNED_SOURCE_MAX_AGE_SECONDS = "86400"
  process.env.GOVERNED_MAX_COST_MICROS = "100000"
  process.env.GOVERNED_MAX_LATENCY_MS = "10000"
  process.env.GOVERNED_MIN_CONFIDENCE = "0.65"
  const prisma = new PrismaClient()
  const tenantA = randomUUID()
  const tenantB = randomUUID()
  const ownerId = randomUUID()
  const reviewerId = randomUUID()
  const contributorId = randomUUID()
  const viewerId = randomUUID()
  const tenantBUserId = randomUUID()
  const owner: GovernedActor = { agencyId: tenantA, userId: ownerId, role: "OWNER" }
  const reviewer: GovernedActor = { agencyId: tenantA, userId: reviewerId, role: "REVIEWER" }
  const contributor: GovernedActor = { agencyId: tenantA, userId: contributorId, role: "CONTRIBUTOR" }
  const viewer: GovernedActor = { agencyId: tenantA, userId: viewerId, role: "VIEWER" }
  const otherReviewer: GovernedActor = { agencyId: tenantB, userId: tenantBUserId, role: "REVIEWER" }

  try {
    await prisma.user.create({ data: { id: ownerId, email: `owner-${ownerId}@test.invalid`, password: "hash", name: "Owner", agency: { create: { id: tenantA, name: "Tenant A", slug: `tenant-a-${tenantA}` } } } })
    await prisma.user.create({ data: { id: tenantBUserId, email: `owner-${tenantBUserId}@test.invalid`, password: "hash", name: "Other Owner", agency: { create: { id: tenantB, name: "Tenant B", slug: `tenant-b-${tenantB}` } } } })
    for (const [id, role] of [[reviewerId, "REVIEWER"], [contributorId, "CONTRIBUTOR"], [viewerId, "VIEWER"]] as const) {
      await prisma.user.create({ data: { id, email: `${role.toLowerCase()}-${id}@test.invalid`, password: "hash", name: role, role: "AGENCY_MEMBER", agencyMember: { create: { agencyId: tenantA, role } } } })
    }

    const now = new Date()
    const activeDocument = {
      externalId: "handbook/customer-onboarding",
      title: "Customer onboarding control handbook",
      content: "Use the verified customer onboarding checklist, validate consent, and record independent reviewer approval before release.",
      allowedRoles: ["CONTRIBUTOR", "REVIEWER"] as Array<"CONTRIBUTOR" | "REVIEWER">,
      sourceUpdatedAt: now.toISOString(),
      deleted: false,
    }
    const restrictedDocument = {
      externalId: "handbook/reviewer-only",
      title: "Customer onboarding reviewer exception",
      content: "Reviewer-only customer onboarding exception guidance must remain hidden from contributors.",
      allowedRoles: ["REVIEWER"] as Array<"REVIEWER">,
      sourceUpdatedAt: now.toISOString(),
      deleted: false,
    }
    const firstSync = verifiedSync(tenantA, "sync-event-0001", [activeDocument, restrictedDocument], now)
    const created = await syncDocuments(prisma, firstSync)
    assert.deepEqual(created, { replayed: false, outcome: { cursor: "cursor-sync-event-0001", created: 2, updated: 0, deleted: 0, unchanged: 0 } })
    assert.equal((await syncDocuments(prisma, firstSync)).replayed, true)
    await assert.rejects(() => syncDocuments(prisma, { ...firstSync, requestHash: "f".repeat(64) }), (error: unknown) => error instanceof GovernedError && error.code === "SYNC_IDEMPOTENCY_CONFLICT")

    const contributorSources = await listSourceDocuments(prisma, contributor)
    assert.deepEqual(contributorSources.map((document) => document.externalId), [activeDocument.externalId])
    assert.equal((await listSourceDocuments(prisma, owner)).length, 2)

    const queued = await createRecommendationJob(prisma, contributor, "customer onboarding checklist approval", "job-idempotency-0001", now)
    assert.equal(queued.replayed, false)
    assert.equal((await createRecommendationJob(prisma, contributor, "customer onboarding checklist approval", "job-idempotency-0001", now)).replayed, true)
    await assert.rejects(() => createRecommendationJob(prisma, contributor, "different recommendation request", "job-idempotency-0001", now), (error: unknown) => error instanceof GovernedError && error.code === "IDEMPOTENCY_CONFLICT")
    await assert.rejects(() => createRecommendationJob(prisma, viewer, "customer onboarding checklist approval", "viewer-job-0001", now), (error: unknown) => error instanceof GovernedError && error.code === "ROLE_FORBIDDEN")

    const processed = await processNextRecommendation(prisma, new DeterministicProvider(), "worker-valid", new Date(now.getTime() + 1_000))
    assert.equal(processed?.id, queued.job.id)
    assert.equal(processed?.status, "AWAITING_APPROVAL")
    assert.deepEqual(processed?.retrievedDocumentIds.length, 1)
    await assert.rejects(() => decideRecommendation(prisma, contributor, queued.job.id, "APPROVE", "Contributor must not approve this result."), (error: unknown) => error instanceof GovernedError && error.code === "ROLE_FORBIDDEN")
    await assert.rejects(() => decideRecommendation(prisma, otherReviewer, queued.job.id, "APPROVE", "Other tenant must not approve this result."), (error: unknown) => error instanceof GovernedError && error.code === "JOB_NOT_FOUND")
    const approved = await decideRecommendation(prisma, reviewer, queued.job.id, "APPROVE", "Reviewed the exact citations and deterministic quality record.")
    assert.equal(approved.status, "APPROVED")
    await assert.rejects(() => decideRecommendation(prisma, reviewer, queued.job.id, "REJECT", "A second decision must not overwrite approval."), (error: unknown) => error instanceof GovernedError && error.code === "JOB_NOT_DECIDABLE")

    const bad = await createRecommendationJob(prisma, contributor, "customer onboarding checklist exception", "job-idempotency-0002", new Date(now.getTime() + 1_000))
    const failedQuality = await processNextRecommendation(prisma, new DeterministicProvider("bad-evidence"), "worker-quality", new Date(now.getTime() + 1_000))
    assert.equal(failedQuality?.id, bad.job.id)
    assert.equal(failedQuality?.status, "FAILED")
    assert.equal(failedQuality?.errorCode, "QUALITY_GATE_FAILED")

    process.env.GOVERNED_MAX_ATTEMPTS = "2"
    const retryJob = await createRecommendationJob(prisma, contributor, "customer onboarding checklist retry", "job-idempotency-0003", new Date(now.getTime() + 2_000))
    const retryOne = await processNextRecommendation(prisma, new DeterministicProvider("retry"), "worker-retry-1", new Date(now.getTime() + 2_000))
    assert.equal(retryOne?.id, retryJob.job.id)
    assert.equal(retryOne?.status, "PENDING")
    await prisma.governedRecommendationJob.update({ where: { id: retryJob.job.id }, data: { scheduledFor: new Date(now.getTime() + 2_000) } })
    const retryTwo = await processNextRecommendation(prisma, new DeterministicProvider("retry"), "worker-retry-2", new Date(now.getTime() + 3_000))
    assert.equal(retryTwo?.status, "FAILED")
    assert.equal(retryTwo?.attemptCount, 2)

    const deleteSync = verifiedSync(tenantA, "sync-event-0002", [{ ...activeDocument, content: "", deleted: true, sourceUpdatedAt: new Date(now.getTime() + 4_000).toISOString() }], new Date(now.getTime() + 4_000))
    const deletion = await syncDocuments(prisma, deleteSync)
    assert.equal((deletion.outcome as { deleted: number }).deleted, 1)
    const tombstone = await prisma.governedSourceDocument.findUniqueOrThrow({ where: { agencyId_externalId: { agencyId: tenantA, externalId: activeDocument.externalId } } })
    assert.ok(tombstone.deletedAt)
    assert.equal(tombstone.content, "")

    process.env.GOVERNED_MAX_ATTEMPTS = "1"
    const staleTime = new Date(now.getTime() - 2 * 86_400_000)
    await syncDocuments(prisma, verifiedSync(tenantB, "sync-event-other-1", [{ ...activeDocument, externalId: "other/stale", sourceUpdatedAt: staleTime.toISOString() }], now))
    const staleJob = await createRecommendationJob(prisma, otherReviewer, "customer onboarding checklist approval", "job-other-stale-1", new Date(now.getTime() + 5_000))
    const staleResult = await processNextRecommendation(prisma, new DeterministicProvider(), "worker-stale", new Date(now.getTime() + 5_000))
    assert.equal(staleResult?.id, staleJob.job.id)
    assert.equal(staleResult?.status, "FAILED")
    assert.equal(staleResult?.errorCode, "NO_FRESH_EVIDENCE")

    const chainA = await verifyAuditChain(prisma, tenantA)
    const chainB = await verifyAuditChain(prisma, tenantB)
    assert.equal(chainA.valid, true)
    assert.equal(chainB.valid, true)
    const firstEvent = await prisma.governedAuditEvent.findFirstOrThrow({ where: { agencyId: tenantA } })
    await assert.rejects(() => prisma.governedAuditEvent.update({ where: { id: firstEvent.id }, data: { action: "TAMPERED" } }))
    const receipt = await prisma.governedSyncReceipt.findFirstOrThrow({ where: { agencyId: tenantA } })
    await assert.rejects(() => prisma.governedSyncReceipt.delete({ where: { id: receipt.id } }))
    assert.equal((await verifyAuditChain(prisma, tenantA)).valid, true)
  } finally {
    await prisma.$disconnect()
  }
})
