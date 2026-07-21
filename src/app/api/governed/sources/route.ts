import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requireActor } from "@/lib/governed-ai/authz"
import { publicError } from "@/lib/governed-ai/errors"
import { listSourceDocuments } from "@/lib/governed-ai/service"

export async function GET() {
  try {
    const actor = await requireActor(prisma)
    const documents = await listSourceDocuments(prisma, actor)
    const maxAgeSeconds = Number(process.env.GOVERNED_SOURCE_MAX_AGE_SECONDS || 86_400)
    const now = Date.now()
    return NextResponse.json({
      documents: documents.map((document) => ({
        ...document,
        freshness: document.deletedAt ? "deleted" : now - document.sourceUpdatedAt.getTime() <= maxAgeSeconds * 1_000 ? "fresh" : "stale",
      })),
    }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    const response = publicError(error)
    return NextResponse.json(response.body, { status: response.status, headers: { "Cache-Control": "no-store" } })
  }
}
