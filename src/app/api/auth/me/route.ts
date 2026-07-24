import { NextResponse } from "next/server"
import { runtimeActor } from "@/lib/runtime-acceptance"

export async function GET(request: Request) {
  const user = await runtimeActor(request)
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, agencyId: user.agencyId } })
}
