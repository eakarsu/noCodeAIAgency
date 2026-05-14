import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const test = await prisma.workflowABTest.findFirst({
    where: { id: params.id, agencyId: session.user.agencyId },
    include: { results: { orderBy: { createdAt: "desc" }, take: 200 } },
  })
  if (!test) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(test)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const test = await prisma.workflowABTest.update({
    where: { id: params.id },
    data: {
      name: body.name,
      trafficSplit: body.trafficSplit,
      status: body.status,
    },
  })
  return NextResponse.json(test)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  await prisma.workflowABTest.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
