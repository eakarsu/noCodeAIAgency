import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !session.user.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Verify workflow belongs to agency
    const workflow = await prisma.workflow.findUnique({
      where: { id, agencyId: session.user.agencyId },
      select: { id: true, version: true },
    })

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    const versions = await prisma.workflowVersion.findMany({
      where: { workflowId: id },
      select: {
        id: true,
        version: true,
        changelog: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      currentVersion: workflow.version,
      versions,
    })
  } catch (error) {
    console.error("Versions fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch versions" },
      { status: 500 }
    )
  }
}
