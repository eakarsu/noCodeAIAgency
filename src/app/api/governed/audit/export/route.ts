import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requireActor, requireRole } from "@/lib/governed-ai/authz"
import { verifyAuditChain } from "@/lib/governed-ai/audit"
import { GovernedError, publicError } from "@/lib/governed-ai/errors"

function csv(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value)
  return `"${text.replaceAll('"', '""')}"`
}

export async function GET() {
  try {
    const actor = await requireActor(prisma)
    requireRole(actor, "OWNER")
    const chain = await verifyAuditChain(prisma, actor.agencyId)
    if (!chain.valid) throw new GovernedError("AUDIT_CHAIN_INVALID", "The audit chain failed verification.", 503)
    const events = await prisma.governedAuditEvent.findMany({ where: { agencyId: actor.agencyId }, orderBy: { sequence: "asc" } })
    const rows = [
      ["sequence", "created_at", "actor_user_id", "action", "entity_type", "entity_id", "payload", "previous_hash", "hash"].map(csv).join(","),
      ...events.map((event) => [event.sequence, event.createdAt.toISOString(), event.actorUserId || "", event.action, event.entityType, event.entityId || "", event.payload, event.previousHash, event.hash].map(csv).join(",")),
    ]
    return new NextResponse(`${rows.join("\n")}\n`, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": "attachment; filename=governed-ai-audit.csv",
        "Content-Type": "text/csv; charset=utf-8",
      },
    })
  } catch (error) {
    const response = publicError(error)
    return NextResponse.json(response.body, { status: response.status, headers: { "Cache-Control": "no-store" } })
  }
}
