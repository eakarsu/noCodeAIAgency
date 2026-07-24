import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { createRuntimeSession } from "@/lib/runtime-acceptance"

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { email?: string; password?: string }
  const email = String(body.email || "").trim().toLowerCase()
  const password = String(body.password || "")
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.disabledAt || !(await bcrypt.compare(password, user.password))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
  }
  const token = await createRuntimeSession(user)
  return NextResponse.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } })
}
