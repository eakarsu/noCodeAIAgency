import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { publicError } from "@/lib/governed-ai/errors"
import { verifySignedSync } from "@/lib/governed-ai/security"
import { syncDocuments } from "@/lib/governed-ai/service"

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const verified = verifySignedSync(rawBody, {
      "x-governed-event-id": request.headers.get("x-governed-event-id"),
      "x-governed-key-id": request.headers.get("x-governed-key-id"),
      "x-governed-timestamp": request.headers.get("x-governed-timestamp"),
      "x-governed-signature": request.headers.get("x-governed-signature"),
    })
    const result = await syncDocuments(prisma, verified)
    return NextResponse.json(result, { status: result.replayed ? 200 : 201, headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    const response = publicError(error)
    return NextResponse.json(response.body, { status: response.status, headers: { "Cache-Control": "no-store" } })
  }
}
