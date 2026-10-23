import { NextResponse } from "next/server"
import { runtimeActor } from "@/lib/runtime-acceptance"
import prisma from "@/lib/db"

export async function GET(request: Request) {
  const user = await runtimeActor(request)
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ status: "ok", service: "no-code-ai-agency", database: "up" })
  } catch {
    return NextResponse.json({ status: "error", service: "no-code-ai-agency", database: "down" }, { status: 503 })
  }
}
