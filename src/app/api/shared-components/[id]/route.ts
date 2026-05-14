import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"

function bumpVersion(v: string) {
  const parts = v.split(".").map((n) => parseInt(n, 10))
  parts[2] = (parts[2] || 0) + 1
  return parts.join(".")
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const c = await prisma.sharedComponent.findFirst({
    where: { id: params.id, agencyId: session.user.agencyId },
  })
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(c)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const existing = await prisma.sharedComponent.findFirst({
    where: { id: params.id, agencyId: session.user.agencyId },
  })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // If content changed, bump version and append to history
  let updateData: Record<string, unknown> = { name: body.name, description: body.description }
  if (body.content) {
    const newVersion = bumpVersion(existing.currentVersion)
    const versions = (existing.versions as Array<Record<string, unknown>>) || []
    versions.push({ version: newVersion, content: body.content, createdAt: new Date().toISOString() })
    updateData = { ...updateData, content: body.content, currentVersion: newVersion, versions }
  }
  const updated = await prisma.sharedComponent.update({ where: { id: params.id }, data: updateData })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  await prisma.sharedComponent.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
