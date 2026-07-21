import { NextResponse } from "next/server"
import prisma from "@/lib/db"

export async function GET() {
  try {
    const rows = await prisma.$queryRaw<Array<{ table_name: string | null }>>`SELECT to_regclass('public."GovernedRecommendationJob"')::text AS table_name`
    if (!rows[0]?.table_name) throw new Error("governed migration missing")
    return NextResponse.json({ status: "ready", service: "governed-ai-recommendation" }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ status: "not_ready" }, { status: 503, headers: { "Cache-Control": "no-store" } })
  }
}
